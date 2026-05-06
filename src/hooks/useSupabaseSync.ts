import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  dbTables, dbOrders, dbOrderItems, dbMenu, dbUsers, dbExpenses, dbCategories, dbShiftSummaries, dbPrintedTickets, dbHotelSales
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
  const [todayTransferTips, setTodayTransferTips] = useState(0);
  const [pettyCashInitial] = useState(5000);
  const [hotelCardSales, setHotelCardSales] = useState(0);
  const [hotelCashSales, setHotelCashSales] = useState(0);
  const [hotelSalesList, setHotelSalesList] = useState<any[]>([]);
  const [todayDebitIncome, setTodayDebitIncome] = useState(0);
  const [todayDebitTips, setTodayDebitTips] = useState(0);
  const [todayCreditIncome, setTodayCreditIncome] = useState(0);
  const [todayCreditTips, setTodayCreditTips] = useState(0);
  const [todayCardIncome, setTodayCardIncome] = useState(0);
  const [todayCardTips, setTodayCardTips] = useState(0);
  const [todayTotalTips, setTodayTotalTips] = useState(0);
  const [todayCashTips, setTodayCashTips] = useState(0);
  const [todayAccountsCount, setTodayAccountsCount] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [todayExpensesList, setTodayExpensesList] = useState<any[]>([]);
  const [todayClosedOrders, setTodayClosedOrders] = useState<OrderRow[]>([]);
  const [dailySummaries, setDailySummaries] = useState<any[]>([]);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState(17.5); // Default fallback
  const [isLoading, setIsLoading] = useState(true);

  // Prevent duplicate fetches with a ref
  const fetching = useRef(false);
  const lastClosed = useRef<Record<number, number>>({});

  // ── Loaders ─────────────────────────────────────────
  
  const fetchExchangeRate = useCallback(async () => {
    try {
      // Intentar obtener el tipo de cambio oficial de BBVA (Venta) mediante nuestra Edge Function
      const { data, error } = await supabase.functions.invoke('get-bbva-rate');
      
      if (!error && data && data.rate) {
        setExchangeRate(data.rate);
        console.log('Exchange rate updated from BBVA:', data.rate);
        return;
      }

      // Fallback a API genérica si la función falla
      const resp = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const fallbackData = await resp.json();
      if (fallbackData && fallbackData.rates && fallbackData.rates.MXN) {
        setExchangeRate(fallbackData.rates.MXN);
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
    }
  }, []);


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
        .sort((a, b) => {
          const idxA = CATEGORIES.indexOf(a.category) === -1 ? 999 : CATEGORIES.indexOf(a.category);
          const idxB = CATEGORIES.indexOf(b.category) === -1 ? 999 : CATEGORIES.indexOf(b.category);
          if (idxA !== idxB) return idxA - idxB;
          return a.name.localeCompare(b.name);
        });
      setMenuItems(converted);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data } = await dbUsers.getAll();
    if (data) setUsers(data);
  }, []);

  const fetchTodayTotals = useCallback(async () => {
    try {
      const results = await Promise.allSettled([

        dbOrders.getTodayIncome(),
        dbExpenses.getToday(),
        dbOrders.getTodayClosedOrders(),
        supabase.from('hotel_sales')
          .select('*')
          .eq('status', 'closed')
      ]);

      const [incomeRes, expensesRes, closedOrdersRes, hotelRes] = results.map(r => 
        r.status === 'fulfilled' ? (r.value as any) : { data: null, error: (r as any).reason }
      );

      console.log('fetchTodayTotals data:', {
        income: incomeRes.data?.length,
        expenses: expensesRes.data?.length,
        closedOrders: closedOrdersRes.data?.length,
        hotel: hotelRes.data?.length
      });

      if (incomeRes.data) {


        setTodayIncome(incomeRes.data.reduce((s: number, o: any) => s + (o.total || 0), 0));
        setTodayAccountsCount(incomeRes.data.length);
      } else {
        setTodayIncome(0);
        setTodayAccountsCount(0);
      }
      
      if (expensesRes.data) {
        setTodayExpenses(expensesRes.data.reduce((s: number, e: any) => s + (e.amount || 0), 0));
        setTodayExpensesList(expensesRes.data);
      } else {
        setTodayExpenses(0);
        setTodayExpensesList([]);
      }

      if (hotelRes.data && hotelRes.data.length > 0) {
        setHotelSalesList(hotelRes.data);
        let hCard = 0;
        let hCash = 0;
        hotelRes.data.forEach((sale: any) => {
          const rate = sale.exchange_rate || exchangeRate;
          const amountInMXN = sale.currency === 'USD' ? Number(sale.amount) * rate : Number(sale.amount);
          if (sale.payment_method === 'tarjeta') hCard += amountInMXN;
          else hCash += amountInMXN;
        });
        setHotelCardSales(hCard);
        setHotelCashSales(hCash);
      } else {
        setHotelSalesList([]);
        setHotelCardSales(0);
        setHotelCashSales(0);
      }

      if (closedOrdersRes.data) {
        setTodayClosedOrders(closedOrdersRes.data);
        
        const cashBase = closedOrdersRes.data
          .filter((o: any) => o.payment_method === 'efectivo')
          .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const cashTips = closedOrdersRes.data
          .filter((o: any) => o.payment_method === 'efectivo')
          .reduce((sum: number, o: any) => sum + (o.tip || 0), 0);
        
        const transferBase = closedOrdersRes.data
          .filter((o: any) => o.payment_method === 'transferencia')
          .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const transferTips = closedOrdersRes.data
          .filter((o: any) => o.payment_method === 'transferencia')
          .reduce((sum: number, o: any) => sum + (o.tip || 0), 0);

        const cardBase = closedOrdersRes.data
          .filter((o: any) => o.payment_method === 'tarjeta')
          .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const cardTips = closedOrdersRes.data
          .filter((o: any) => o.payment_method === 'tarjeta')
          .reduce((sum: number, o: any) => sum + (o.tip || 0), 0);

        const totalTips = cashTips + transferTips + cardTips;

        setTodayCashIncome(cashBase);
        setTodayCashTips(cashTips);
        setTodayTransferIncome(transferBase);
        setTodayTransferTips(transferTips);
        setTodayDebitIncome(0); // Deprecated
        setTodayDebitTips(0);   // Deprecated
        setTodayCreditIncome(0); // Deprecated
        setTodayCreditTips(0);   // Deprecated
        setTodayCardIncome(cardBase);
        setTodayCardTips(cardTips);
        setTodayTotalTips(totalTips);
      } else {
        setTodayClosedOrders([]);
        setTodayCashIncome(0);
        setTodayCashTips(0);
        setTodayTransferIncome(0);
        setTodayTransferTips(0);
        setTodayDebitIncome(0);
        setTodayDebitTips(0);
        setTodayCreditIncome(0);
        setTodayCreditTips(0);
        setTodayCardIncome(0);
        setTodayCardTips(0);
        setTodayTotalTips(0);
      }
      const { data: tickets } = await dbPrintedTickets.getToday();
      if (tickets) setPendingTickets(tickets);

    } catch (err) {
      console.error('Error fetching today totals:', err);
    }
  }, [exchangeRate]);


  const fetchDailySummaries = useCallback(async () => {
    const { data } = await dbShiftSummaries.getAll();
    if (data) setDailySummaries(data);
  }, []);

  const fetchTodayTickets = useCallback(async () => {
    const { data } = await dbPrintedTickets.getToday();
    if (data) setPendingTickets(data);
  }, []);

  const fetchRegistrations = useCallback(async () => {
    const { data } = await supabase
      .from('guest_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRegistrations(data);
  }, []);

  const deleteRegistration = useCallback(async (id: string) => {
    const { error } = await supabase.from('guest_registrations').delete().eq('id', id);
    if (!error) await fetchRegistrations();
  }, [fetchRegistrations]);

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
        fetchDailySummaries(),
        fetchTodayTickets(),
        fetchRegistrations(),
        fetchExchangeRate()
      ]);
    } finally {
      setIsLoading(false);
      fetching.current = false;
    }
  }, [fetchTables, fetchOrdersAndItems, fetchMenu, fetchUsers, fetchTodayTotals, fetchDailySummaries, fetchTodayTickets, fetchExchangeRate]);

  // ── Realtime subscriptions ──────────────────────────
  useEffect(() => {
    fetchAll();
    
    // Auto-update exchange rate every hour
    const rateInterval = setInterval(fetchExchangeRate, 3600000);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'printed_tickets' }, fetchTodayTickets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_registrations' }, fetchRegistrations)
      .subscribe();


    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(rateInterval);
    };
  }, [fetchAll, fetchExchangeRate]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Operations ──────────────────────────────────────

  const addItemToOrder = useCallback(async (
    tableId: number,
    item: MenuItem,
    variant?: MenuVariant,
    notes?: string,
    customPrice?: number
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
      price: customPrice !== undefined ? customPrice : (variant ? variant.price : item.price),
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

  const markTableDone = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    await dbOrderItems.markTableDone(itemIds);
    await fetchOrdersAndItems();
  }, [fetchOrdersAndItems]);

  const updateItemNotes = useCallback(async (itemId: string, notes: string) => {
    await dbOrderItems.updateNotes(itemId, notes);
  }, []);

  const markItemsPrinted = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    await dbOrderItems.markPrinted(itemIds);
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

  const confirmPayment = useCallback(async (tableId: number, method: string, customTotal?: number, customTip?: number, discountReason?: string) => {
    const order = tableOrders[tableId];
    if (!order) return;

    // Last minute recalculation
    const items = activeItems.filter(i => i.table_id === tableId);
    let total = items.reduce((s, i) => s + (i.price * i.qty), 0);
    if (customTotal !== undefined) {
      total = customTotal;
    }
    let summary = items.map(i => `${i.qty}x ${i.name}`).join(', ');
    if (discountReason && discountReason.trim() !== '') {
      summary += ` | Desc: ${discountReason.trim()}`;
    }

    // Block stale realtime fetches for 5 seconds
    lastClosed.current[tableId] = Date.now();

    // Optimistically free the table in UI immediately
    setTableOrders(prev => {
      const copy = { ...prev };
      delete copy[tableId];
      return copy;
    });
    setActiveItems(prev => prev.filter(i => i.table_id !== tableId));

    // 1. Close the primary order
    const { error: orderError } = await dbOrders.updateStatus(order.id, 'closed', {
      payment_method: method, 
      total, 
      items_summary: summary,
      tip: customTip
    });
    
    // Cancel any ghost orders for this table
    await dbOrders.cancelAllActiveForTable(tableId);

    if (orderError) {
      console.error(orderError);
      alert("Error crítico al cerrar orden: " + orderError.message);
      return;
    }
    
    // 2. Free or deactivate the table
    const table = tables.find(t => t.id === tableId);
    if (table?.category === 'Pedidos para llevar') {
      // Instead of deactivating, just free it so it shows as "closed" in the list until closeDay
      const { error: tableError } = await dbTables.updateStatus(tableId, 'free');
      if (tableError) console.error('Error freeing delivery table:', tableError);
    } else {
      const { error: tableError } = await dbTables.updateStatus(tableId, 'free');
      if (tableError) {
        console.error(tableError);
        alert("Error crítico al liberar mesa: " + tableError.message);
      }
    }
    
    // 3. Force refresh totals safely (orders will ignore this table for 5s)
    await Promise.all([
      fetchTodayTotals(),
      fetchTables(),
      fetchOrdersAndItems(),
    ]);
  }, [tableOrders, activeItems, fetchTodayTotals, fetchTables, fetchOrdersAndItems]);

  const cancelTable = useCallback(async (tableId: number) => {
    // Block stale realtime fetches for 5 seconds
    lastClosed.current[tableId] = Date.now();

    // Optimistically free the table in UI immediately
    setTableOrders(prev => {
      const copy = { ...prev };
      delete copy[tableId];
      return copy;
    });
    setActiveItems(prev => prev.filter(i => i.table_id !== tableId));

    // 1. Cancel ALL active orders for this table
    const { error: orderError } = await dbOrders.cancelAllActiveForTable(tableId);

    if (orderError) {
      console.error(orderError);
      alert("Error crítico al cancelar orden: " + orderError.message);
      return;
    }
    
    // 2. Free the table
    const { error: tableError } = await dbTables.updateStatus(tableId, 'free');
    if (tableError) {
      console.error(tableError);
      alert("Error crítico al liberar mesa: " + tableError.message);
    }
    
    // 3. Force refresh
    await Promise.all([
      fetchTables(),
      fetchOrdersAndItems(),
    ]);
  }, [fetchTables, fetchOrdersAndItems]);

  const addExpense = useCallback(async (amount: number, concept: string, detail: string) => {
    await dbExpenses.insert(amount, concept, detail);
    await fetchTodayTotals();
  }, [fetchTodayTotals]);

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

  const addCategory = useCallback(async (name: string) => {
    const { data, error } = await dbCategories.insert(name);
    if (!error) await fetchMenu();
    return { data, error };
  }, [fetchMenu]);

  const addMenuItem = useCallback(async (item: { name: string; price: number; category_id: string; has_variants: boolean; active: boolean }) => {
    const { data, error } = await dbMenu.insertItem(item);
    if (!error) await fetchMenu();
    return { data, error };
  }, [fetchMenu]);

  const addMenuVariant = useCallback(async (variant: { menu_item_id: string; label: string; price: number; active: boolean; sort_order: number }) => {
    const { data, error } = await dbMenu.insertVariant(variant);
    if (!error) await fetchMenu();
    return { data, error };
  }, [fetchMenu]);

  const addTable = useCallback(async (id: number) => {
    await dbTables.insert(id, `Mesa ${id}`, 'Terraza');
  }, []);

  const deleteTable = useCallback(async (id: number) => {
    await dbTables.delete(id);
  }, []);

  const addUser = useCallback(async (name: string, role: 'Administrador' | 'Staff' | 'Encargado', password: string) => {
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

  const closeDay = useCallback(async (adminName: string, overrideCashTips?: number) => {
    try {
      console.log('Starting shift closure process...');
      const finalCashTips = overrideCashTips !== undefined ? overrideCashTips : todayCashTips;
      const finalTotalTips = todayTotalTips - todayCashTips + finalCashTips;

      // 1. Calculate handover values exactly as shown in UI
      const totalEfectivoPesos = todayCashIncome + hotelCashSales;
      
      const hotelSalesListRaw = hotelSalesList || [];
      const dolaresEfectivoOriginal = hotelSalesListRaw
        .filter((s: any) => s.currency === 'USD' && s.payment_method === 'efectivo')
        .reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const dolaresEfectivoConvertido = dolaresEfectivoOriginal * exchangeRate;

      const totalTarjeta = todayCardIncome + hotelCardSales;
      const propinasTC = todayCardTips;

      const handoverCash = (pettyCashInitial + totalEfectivoPesos - todayExpenses) - 5000;
      const handoverDollars = dolaresEfectivoConvertido;
      const handoverCard = totalTarjeta + propinasTC;
      const handoverTransfer = todayTransferIncome + todayTransferTips;
      const handoverTotal = handoverCash + handoverDollars + handoverCard + handoverTransfer;

      const { error } = await dbShiftSummaries.insert({
        income: todayIncome,
        cash_income: todayCashIncome,
        cash_tips: finalCashTips,
        debit_income: todayDebitIncome,
        debit_tips: todayDebitTips,
        credit_income: todayCreditIncome,
        credit_tips: todayCreditTips,
        transfer_income: todayTransferIncome,
        transfer_tips: todayTransferTips,
        card_income: todayCardIncome,
        card_tips: todayCardTips,
        expenses: todayExpenses,
        accounts_count: todayAccountsCount,
        expenses_list: todayExpensesList,
        hotel_income: hotelCardSales + hotelCashSales,
        hotel_card_income: hotelCardSales,
        hotel_cash_income: hotelCashSales,
        closed_by: adminName,
        total_income: todayIncome + hotelCardSales + hotelCashSales, // Base income without tips
        total_tips: finalTotalTips,
        // Handover fields
        handover_cash: handoverCash,
        handover_dollars: handoverDollars,
        handover_card: handoverCard,
        handover_total: handoverTotal,
        petty_cash_at_close: pettyCashInitial,
      });

      if (error) {
        console.error('Error creating daily summary:', error);
        throw error;
      }

      // 2. Refresh lists one last time before archiving to be absolutely sure
      const { data: latestOrders } = await dbOrders.getTodayClosedOrders();
      const { data: latestExpenses } = await dbExpenses.getToday();
      const { data: latestHotel } = await supabase.from('hotel_sales').select('*').eq('status', 'closed');

      const orderIds = (latestOrders || []).map(o => o.id);
      const expenseIds = (latestExpenses || []).map(e => e.id);
      const hotelSaleIds = (latestHotel || []).map(h => h.id);

      console.log('Archiving turn items:', { orders: orderIds.length, expenses: expenseIds.length, hotel: hotelSaleIds.length });

      const archivingTasks = [];
      if (orderIds.length > 0) archivingTasks.push(dbOrders.archiveOrders(orderIds));
      if (expenseIds.length > 0) archivingTasks.push(dbExpenses.archiveExpenses(expenseIds));
      if (hotelSaleIds.length > 0) archivingTasks.push(dbHotelSales.archiveSales(hotelSaleIds));

      // 2.5 Clear printed tickets
      const { data: latestTickets } = await dbPrintedTickets.getToday();
      const ticketIds = (latestTickets || []).map(t => t.id);
      if (ticketIds.length > 0) {
        archivingTasks.push(supabase.from('printed_tickets').delete().in('id', ticketIds));
      }

      if (archivingTasks.length > 0) {
        const results = await Promise.allSettled(archivingTasks);
        results.forEach((res, i) => {
          if (res.status === 'rejected') console.error(`Archiving/Deletion task ${i} failed:`, res.reason);
        });
      }

      // 3. Force Reset local states immediately for snappy UI
      setTodayIncome(0);
      setTodayCashIncome(0);
      setTodayCashTips(0);
      setTodayTransferIncome(0);
      setTodayTransferTips(0);
      setTodayDebitIncome(0);
      setTodayDebitTips(0);
      setTodayCreditIncome(0);
      setTodayCreditTips(0);
      setTodayCardIncome(0);
      setTodayCardTips(0);
      setTodayTotalTips(0);
      setTodayAccountsCount(0);
      setTodayExpenses(0);
      setTodayExpensesList([]);
      setTodayClosedOrders([]);
      setPendingTickets([]);
      setHotelCardSales(0);
      setHotelCashSales(0);
      setHotelSalesList([]);
      setActiveItems([]);
      setTableOrders({});

      // 4. Cancel any dangling open orders and reset all tables
      await Promise.all([
        supabase.from('orders').update({ status: 'cancelled' }).in('status', ['open', 'paying']),
        supabase.from('tables').update({ status: 'free' }).neq('status', 'free')
      ]);

      const deliveryTables = tables.filter(t => t.category === 'Pedidos para llevar');
      if (deliveryTables.length > 0) {
        const deliveryIds = deliveryTables.map(t => t.id);
        await supabase.from('tables').update({ is_active: false }).in('id', deliveryIds);
      }

      // 5. Final confirmation refresh
      console.log('Shift closed successfully. Resetting totals...');
      await Promise.all([
        fetchDailySummaries(),
        fetchTodayTotals(),
        fetchTables()
      ]);
      
      return { success: true };
    } catch (err) {
      console.error('Critical error during shift closure:', err);
      return { success: false, error: err };
    }
  }, [
    todayIncome, todayCashIncome, todayCashTips,
    todayDebitIncome, todayDebitTips,
    todayCreditIncome, todayCreditTips,
    todayTransferIncome, todayTransferTips,
    todayCardIncome, todayCardTips,
    todayExpenses, todayAccountsCount, todayExpensesList, todayClosedOrders, hotelSalesList,
    hotelCardSales, hotelCashSales,
    fetchDailySummaries, fetchTodayTotals
  ]);



  const deleteShiftSummary = useCallback(async (id: string) => {
    setDailySummaries(prev => prev.filter((s: any) => s.id !== id));
    await dbShiftSummaries.delete(id);
  }, []);

  const createOrderForTable = useCallback(async (tableId: number, customerName?: string) => {
    if (!tableOrders[tableId]) {
      const { data } = await dbOrders.create(tableId, customerName);
      if (data) {
        setTableOrders(prev => ({ ...prev, [tableId]: data }));
      }
    }
  }, [tableOrders]);

  const createDeliveryOrder = useCallback(async (customerName: string) => {
    // 1. Create a dynamic table for the delivery
    const { data: table, error: tErr } = await dbTables.insertDynamic(customerName, 'Pedidos para llevar');
    if (tErr || !table) {
      console.error('Error creating delivery table:', tErr);
      return;
    }

    // 2. Refresh tables and create order
    await fetchTables();
    await createOrderForTable(table.id, customerName);
    return table.id;
  }, [fetchTables, createOrderForTable]);

  const logPrintedTicket = useCallback(async (tableId: number, printedBy: string, total: number, itemsSummary: string) => {
    await dbPrintedTickets.insert(tableId, printedBy, total, itemsSummary);
    await fetchTodayTickets();
  }, [fetchTodayTickets]);

  const markTicketPrinted = useCallback(async (id: number) => {
    await dbPrintedTickets.markPrinted(id);
    await fetchTodayTickets();
  }, [fetchTodayTickets]);
  const deleteTicket = useCallback(async (id: number) => {
    await dbPrintedTickets.delete(id);
    await fetchTodayTickets();
  }, [fetchTodayTickets]);

  const deleteClosedOrder = useCallback(async (id: string) => {
    await dbOrders.delete(id);
    await fetchTodayTotals();
  }, [fetchTodayTotals]);

  const addHotelSale = async (amount: number, currency: string, paymentMethod: string) => {
    let finalAmount = amount;
    let finalCurrency = currency;

    if (currency === 'USD') {
      finalAmount = amount * exchangeRate;
      finalCurrency = 'MXN';
    }

    const { error } = await supabase
      .from('hotel_sales')
      .insert([{
        amount: finalAmount,
        currency: finalCurrency,
        payment_method: paymentMethod,
        exchange_rate: exchangeRate,
        status: 'closed'
      }]);
    if (error) console.error('Error adding hotel sale:', error);
    else fetchTodayTotals();
  };

  const deleteHotelSale = async (id: string) => {
    try {
      const { error } = await supabase.from('hotel_sales').delete().eq('id', id);
      if (error) throw error;
      await fetchTodayTotals();
    } catch (error) {
      console.error('Error deleting hotel sale:', error);
    }
  };

  return {
    // State
    tables,
    tableOrders,
    activeItems,
    menuItems,
    users,
    todayIncome,
    todayCashIncome,
    todayCashTips,
    todayTransferIncome,
    todayTransferTips,
    todayDebitIncome,
    todayDebitTips,
    todayCreditIncome,
    todayCreditTips,
    todayCardIncome,
    todayCardTips,
    todayTotalTips,
    todayAccountsCount,
    todayExpenses,
    todayExpensesList,
    todayClosedOrders,
    pettyCashInitial,
    hotelCardSales,
    hotelCashSales,
    hotelSalesList,
    addHotelSale,
    deleteHotelSale,
    exchangeRate,
    fetchExchangeRate,
    fetchTodayTotals,
    dailySummaries,

    pendingTickets,
    isLoading,
    registrations,

    // Actions
    createOrderForTable,
    createDeliveryOrder,
    addItemToOrder,
    removeItem,
    markItemDone,
    markTableDone,
    updateItemNotes,
    markItemsPrinted,
    checkoutTable,
    confirmPayment,
    cancelTable,
    addExpense,
    toggleMenuItem,
    toggleMenuVariant,
    updateMenuItem,
    updateMenuVariant,
    updateCategory,
    addCategory,
    addMenuItem,
    addMenuVariant,
    addTable,
    deleteTable,
    addUser,
    deleteUser,
    updateUser,
    closeSession,
    closeDay,
    deleteShiftSummary,
    logPrintedTicket,
    markTicketPrinted,
    deleteTicket,
    fetchRegistrations,
    deleteRegistration,
    deleteClosedOrder,
  };
}
