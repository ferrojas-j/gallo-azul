import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  dbTables, dbOrders, dbOrderItems, dbMenu, dbUsers, dbExpenses, dbCategories, dbShiftSummaries,
} from '../lib/supabaseService';
import type {
  TableRow, OrderRow, OrderItemRow, MenuItemRow, UserRow,
} from '../lib/supabaseService';
import { CATEGORIES } from '../data/menu';
import type { MenuItem, MenuVariant } from '../data/menu';

// ─── Derived types ──────────────────────────────────────
export type ActiveItem = OrderItemRow & { table_id: number };

// Convert Supabase menu to app MenuItem format
function toAppMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    category: (row.menu_categories as any)?.name ?? '',
    categoryId: (row.menu_categories as any)?.id ?? undefined,
    active: row.active,
    hasVariants: row.has_variants,
    variantType: row.variant_type as 'bread' | 'flour' | undefined,
    variants: (row.menu_item_variants ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(v => ({ id: v.id, label: v.label, price: v.price, active: v.active })),
  };
}

// ─── Hook ───────────────────────────────────────────────
export function useSupabaseSync() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tableOrders, setTableOrders] = useState<Record<number, OrderRow>>({});
  const [activeItems, setActiveItems] = useState<ActiveItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayCashIncome, setTodayCashIncome] = useState(0);
  const [todayTransferIncome, setTodayTransferIncome] = useState(0);
  const [todayAccountsCount, setTodayAccountsCount] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [todayExpensesList, setTodayExpensesList] = useState<any[]>([]);
  const [todayClosedOrders, setTodayClosedOrders] = useState<OrderRow[]>([]);
  const [dailySummaries, setDailySummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent duplicate fetches with a ref
  const fetching = useRef(false);
  const lastClosed = useRef<Record<number, number>>({});

  // ── Loaders ─────────────────────────────────────────

  const fetchTables = useCallback(async () => {
    const { data } = await dbTables.getAll();
    if (data) setTables(data);
  }, []);

  const fetchOrdersAndItems = useCallback(async () => {
    const { data: orders } = await dbOrders.getActive();
    if (!orders) {
      setTableOrders({});
      setActiveItems([]);
      return;
    }

    const orderMap: Record<number, OrderRow> = {};
    const orderIdToTable: Record<string, number> = {};
    const now = Date.now();
    
    orders.forEach(o => {
      // Prevent stale data from reverting table status during 5 seconds after a payment
      if (lastClosed.current[o.table_id] && (now - lastClosed.current[o.table_id] < 5000)) {
        return; 
      }
      orderMap[o.table_id] = o;
      orderIdToTable[o.id] = o.table_id;
    });
    setTableOrders(orderMap);

    const orderIds = orders.map(o => o.id);
    const { data: items } = await dbOrderItems.getForOrders(orderIds);
    if (items) {
      const enriched: ActiveItem[] = items.map(item => ({
        ...item,
        table_id: orderIdToTable[item.order_id] || 0,
      }));
      setActiveItems(enriched);
    } else {
      setActiveItems([]);
    }
  }, []);

  const fetchMenu = useCallback(async () => {
    const { data } = await dbMenu.getAll();
    if (data) {
      const converted = (data as MenuItemRow[])
        .map(toAppMenuItem)
        .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));
      setMenuItems(converted);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data } = await dbUsers.getAll();
    if (data) setUsers(data);
  }, []);

  const fetchTodayTotals = useCallback(async () => {
    const [incomeRes, expensesRes, closedOrdersRes] = await Promise.all([
      dbOrders.getTodayIncome(),
      dbExpenses.getToday(),
      dbOrders.getTodayClosedOrders(),
    ]);

    if (incomeRes.data) {
      setTodayIncome(incomeRes.data.reduce((s: number, o: any) => s + (o.total || 0), 0));
      setTodayAccountsCount(incomeRes.data.length);
    }
    
    if (expensesRes.data) {
      setTodayExpenses(expensesRes.data.reduce((s: number, e: any) => s + (e.amount || 0), 0));
      setTodayExpensesList(expensesRes.data);
    }

    if (closedOrdersRes.data) {
      setTodayClosedOrders(closedOrdersRes.data);
      const cash = closedOrdersRes.data
        .filter(o => o.payment_method === 'efectivo')
        .reduce((sum, o) => sum + (o.total || 0), 0);
      const transfer = closedOrdersRes.data
        .filter(o => o.payment_method !== 'efectivo')
        .reduce((sum, o) => sum + (o.total || 0), 0);
      setTodayCashIncome(cash);
      setTodayTransferIncome(transfer);
    }
  }, []);

  const fetchDailySummaries = useCallback(async () => {
    const { data } = await dbShiftSummaries.getAll();
    if (data) setDailySummaries(data);
  }, []);


  const fetchAll = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    setIsLoading(true);
    try {
      await Promise.all([
        fetchTables(), 
        fetchOrdersAndItems(), 
        fetchMenu(), 
        fetchUsers(), 
        fetchTodayTotals(),
        fetchDailySummaries()
      ]);
    } finally {
      setIsLoading(false);
      fetching.current = false;
    }
  }, [fetchTables, fetchOrdersAndItems, fetchMenu, fetchUsers, fetchTodayTotals, fetchDailySummaries]);

  // ── Realtime subscriptions ──────────────────────────
  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchTables)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrdersAndItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchOrdersAndItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchTodayTotals)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, fetchMenu)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_item_variants' }, fetchMenu)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categories' }, fetchMenu)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_summaries' }, fetchDailySummaries)
      .subscribe();


    return () => { supabase.removeChannel(channel); };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Operations ──────────────────────────────────────

  const addItemToOrder = useCallback(async (
    tableId: number,
    item: MenuItem,
    variant?: MenuVariant,
    notes?: string
  ) => {
    let order = tableOrders[tableId];

    // Create order if none exists
    if (!order) {
      const { data: newOrder, error } = await dbOrders.create(tableId);
      if (error || !newOrder) return;
      order = newOrder;
      await dbTables.updateStatus(tableId, 'occupied');
    }

    await dbOrderItems.insert({
      order_id: order.id,
      menu_item_id: item.id,
      name: item.name,
      price: variant ? variant.price : item.price,
      qty: 1,
      variant_label: variant?.label,
      notes: notes || undefined,
    });

    // Forced manual sync after operation
    await fetchOrdersAndItems();
  }, [tableOrders, fetchOrdersAndItems]);

  const removeItem = useCallback(async (itemId: string) => {
    await dbOrderItems.cancel(itemId);
    await fetchOrdersAndItems();
  }, [fetchOrdersAndItems]);

  const markItemDone = useCallback(async (itemId: string) => {
    await dbOrderItems.markDone(itemId);
    await fetchOrdersAndItems();
  }, [fetchOrdersAndItems]);

  const updateItemNotes = useCallback(async (itemId: string, notes: string) => {
    await dbOrderItems.updateNotes(itemId, notes);
  }, []);

  const checkoutTable = useCallback(async (tableId: number) => {
    const order = tableOrders[tableId];
    if (!order) return;
    
    // Calculate total at checkout point
    const items = activeItems.filter(i => i.table_id === tableId);
    const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
    const summary = items.map(i => `${i.qty}x ${i.name}`).join(', ');

    // Only update the order status — table stays 'occupied' until payment is confirmed
    await dbOrders.updateStatus(order.id, 'paying', { total, items_summary: summary });
    
    await fetchOrdersAndItems();
  }, [tableOrders, activeItems, fetchOrdersAndItems]);

  const confirmPayment = useCallback(async (tableId: number, method: string) => {
    const order = tableOrders[tableId];
    if (!order) return;

    // Last minute recalculation
    const items = activeItems.filter(i => i.table_id === tableId);
    const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
    const summary = items.map(i => `${i.qty}x ${i.name}`).join(', ');

    // Block stale realtime fetches for 5 seconds
    lastClosed.current[tableId] = Date.now();

    // Optimistically free the table in UI immediately
    setTableOrders(prev => {
      const copy = { ...prev };
      delete copy[tableId];
      return copy;
    });
    setActiveItems(prev => prev.filter(i => i.table_id !== tableId));

    // 1. Close ALL active orders for this table (prevents ghost orders)
    const { error: orderError } = await dbOrders.closeAllActiveForTable(tableId, { 
      payment_method: method, 
      total, 
      items_summary: summary 
    });

    if (orderError) {
      console.error(orderError);
      alert("Error crítico al cerrar orden: " + orderError.message);
      return;
    }
    
    // 2. Free the table
    const { error: tableError } = await dbTables.updateStatus(tableId, 'free');
    if (tableError) {
      console.error(tableError);
      alert("Error crítico al liberar mesa: " + tableError.message);
    }
    
    // 3. Force refresh totals safely (orders will ignore this table for 5s)
    await Promise.all([
      fetchTodayTotals(),
      fetchTables(),
      fetchOrdersAndItems(),
    ]);
  }, [tableOrders, activeItems, fetchTodayTotals, fetchTables, fetchOrdersAndItems]);

  const addExpense = useCallback(async (amount: number, concept: string, detail: string) => {
    await dbExpenses.insert(amount, concept, detail);
  }, []);

  const toggleMenuItem = useCallback(async (id: string, active: boolean) => {
    // Optimistic update
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, active } : m));
    await dbMenu.toggleActive(id, active);
  }, []);

  const toggleMenuVariant = useCallback(async (id: string, active: boolean) => {
    // Optimistic update — update variant inside its parent item
    setMenuItems(prev => prev.map(m => ({
      ...m,
      variants: m.variants?.map(v => v.id === id ? { ...v, active } : v),
    })));
    await dbMenu.toggleVariantActive(id, active);
  }, []);

  const updateMenuItem = useCallback(async (id: string, name: string, price: number) => {
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, name, price } : m));
    await dbMenu.updateItem(id, name, price);
  }, []);

  const updateMenuVariant = useCallback(async (id: string, label: string, price: number) => {
    setMenuItems(prev => prev.map(m => ({
      ...m,
      variants: m.variants?.map(v => v.id === id ? { ...v, label, price } : v),
    })));
    await dbMenu.updateVariant(id, label, price);
  }, []);

  const updateCategory = useCallback(async (id: string, name: string) => {
    setMenuItems(prev => prev.map(m => m.categoryId === id ? { ...m, category: name } : m));
    await dbCategories.updateName(id, name);
  }, []);

  const addTable = useCallback(async (id: number) => {
    await dbTables.insert(id);
  }, []);

  const deleteTable = useCallback(async (id: number) => {
    await dbTables.delete(id);
  }, []);

  const addUser = useCallback(async (name: string, role: 'Administrador' | 'Staff', password: string) => {
    const { error } = await dbUsers.insert(name, role, password);
    if (!error) await fetchUsers();
    return { error };
  }, [fetchUsers]);


  const deleteUser = useCallback(async (id: string) => {
    await dbUsers.delete(id);
    await fetchUsers();
  }, [fetchUsers]);

  const updateUser = useCallback(async (id: string, name: string, role: string) => {
    await dbUsers.update(id, name, role);
    await fetchUsers();
  }, [fetchUsers]);

  const closeSession = useCallback(async (id: string) => {
    await dbUsers.closeSession(id);
    await fetchUsers();
  }, [fetchUsers]);

  const closeDay = useCallback(async (adminName: string) => {
    // 1. Create the summary record
    const { error } = await dbShiftSummaries.insert({

      income: todayIncome,
      cash_income: todayCashIncome,
      transfer_income: todayTransferIncome,
      expenses: todayExpenses,
      accounts_count: todayAccountsCount,
      expenses_list: todayExpensesList,
      closed_by: adminName,
    });

    if (error) {
      console.error('Error creating daily summary:', error);
      return;
    }

    // 2. Archive orders and expenses from the turn
    const orderIds = todayClosedOrders.map(o => o.id);
    const expenseIds = todayExpensesList.map(e => e.id);

    if (orderIds.length > 0) await dbOrders.archiveOrders(orderIds);
    if (expenseIds.length > 0) await dbExpenses.archiveExpenses(expenseIds);

    // 3. Refresh everything
    await fetchDailySummaries();
    await fetchTodayTotals();
  }, [
    todayIncome, todayCashIncome, todayTransferIncome, 
    todayExpenses, todayAccountsCount, todayExpensesList, todayClosedOrders,
    fetchDailySummaries, fetchTodayTotals
  ]);

  const deleteShiftSummary = useCallback(async (id: string) => {
    setDailySummaries(prev => prev.filter((s: any) => s.id !== id));
    await dbShiftSummaries.delete(id);
  }, []);

  const createOrderForTable = useCallback(async (tableId: number) => {
    if (!tableOrders[tableId]) {
      const { data } = await dbOrders.create(tableId);
      if (data) {
        setTableOrders(prev => ({ ...prev, [tableId]: data }));
      }
    }
  }, [tableOrders]);

  return {
    // State
    tables,
    tableOrders,
    activeItems,
    menuItems,
    users,
    todayIncome,
    todayCashIncome,
    todayTransferIncome,
    todayAccountsCount,
    todayExpenses,
    todayExpensesList,
    todayClosedOrders,
    dailySummaries,
    isLoading,
    // Operations
    createOrderForTable,
    addItemToOrder,
    removeItem,
    markItemDone,
    updateItemNotes,
    checkoutTable,
    confirmPayment,
    addExpense,
    toggleMenuItem,
    toggleMenuVariant,
    updateMenuItem,
    updateMenuVariant,
    updateCategory,
    addTable,
    deleteTable,
    addUser,
    deleteUser,
    updateUser,
    closeSession,
    closeDay,
    deleteShiftSummary,
  };
}
