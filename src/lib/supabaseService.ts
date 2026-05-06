import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────
export type TableRow = {
  id: number;
  name: string;
  category: string;
  status: 'free' | 'occupied' | 'paying';
  capacity: number;
  notes: string | null;
  is_active: boolean;
};

export type OrderRow = {
  id: string;
  table_id: number;
  customer_name?: string;
  status: 'open' | 'paying' | 'closed' | 'cancelled' | 'archived';
  payment_method: string | null;
  total: number;
  tip?: number;
  items_summary?: string; // Descriptive summary of items
  closed_at?: string; // ISO timestamp
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  qty: number;
  variant_label: string | null;
  notes: string | null;
  status: 'pending' | 'done' | 'cancelled';
  is_printed?: boolean;
  created_at: string;
};

export type MenuVariantRow = {
  id: string;
  label: string;
  price: number;
  active: boolean;
  sort_order: number;
};

export type MenuItemRow = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  has_variants: boolean;
  variant_type: string | null;
  category_id: string | null;
  menu_categories: { id: string; name: string } | null;
  menu_item_variants: MenuVariantRow[];
};

export type UserRow = {
  id: string;
  name: string;
  role: 'Administrador' | 'Staff' | 'Encargado';
  password: string;
  active: boolean;
  session_active: boolean;
};

// ─── Queries ─────────────────────────────────────────────

export const dbTables = {
  getAll: () => supabase.from('tables').select('*').eq('is_active', true).order('category').order('id'),
  updateStatus: (id: number, status: TableRow['status']) =>
    supabase.from('tables').update({ status }).eq('id', id),
  insert: (id: number, name: string, category: string) =>
    supabase.from('tables').insert({ id, name, category, status: 'free', capacity: 4, is_active: true }),
  insertDynamic: (name: string, category: string) =>
    supabase.from('tables').insert({ name, category, status: 'occupied', capacity: 1, is_active: true }).select().single(),
  deactivate: (id: number) =>
    supabase.from('tables').update({ is_active: false }).eq('id', id),
  delete: (id: number) =>
    supabase.from('tables').delete().eq('id', id),
};

export const dbOrders = {
  getActive: () =>
    supabase.from('orders').select('*').in('status', ['open', 'paying']),
  getForTable: (tableId: number) =>
    supabase.from('orders').select('*').eq('table_id', tableId).in('status', ['open', 'paying']).maybeSingle(),
  create: (tableId: number, customerName?: string) =>
    supabase.from('orders').insert({ table_id: tableId, customer_name: customerName, status: 'open' }).select().single(),
  updateStatus: (id: string, status: OrderRow['status'], params?: {
    payment_method?: string;
    total?: number;
    items_summary?: string;
    tip?: number;
  }) =>
    supabase.from('orders').update({
      status,
      ...(params?.payment_method ? { payment_method: params.payment_method } : {}),
      ...(params?.total !== undefined ? { total: params.total } : {}),
      ...(params?.items_summary ? { items_summary: params.items_summary } : {}),
      ...(params?.tip !== undefined ? { tip: params.tip } : {}),
      ...(status === 'closed' ? { closed_at: new Date().toISOString() } : {}),
    }).eq('id', id),
  getMexicoToday: () => {
    return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mazatlan'}).format(new Date());
  },
  getTodayIncome: () => {
    return supabase
      .from('orders')
      .select('total, tip')
      .eq('status', 'closed'); // All closed orders that haven't been archived yet
  },
  getTodayClosedOrders: () => {
    return supabase
      .from('orders')
      .select('*')
      .eq('status', 'closed')
      .order('closed_at', { ascending: false });
  },
  archiveOrders: (ids: string[]) =>
    supabase.from('orders').update({ status: 'archived' }).in('id', ids),
  closeAllActiveForTable: (tableId: number, params: {
    payment_method: string;
    total: number;
    items_summary: string;
    tip?: number;
  }) =>
    supabase.from('orders').update({
      status: 'closed',
      payment_method: params.payment_method,
      total: params.total,
      items_summary: params.items_summary,
      ...(params.tip !== undefined ? { tip: params.tip } : {}),
      closed_at: new Date().toISOString()
    }).eq('table_id', tableId).in('status', ['open', 'paying']),
  cancelAllActiveForTable: (tableId: number) =>
    supabase.from('orders').update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    }).eq('table_id', tableId).in('status', ['open', 'paying']),
  delete: (id: string) =>
    supabase.from('orders').delete().eq('id', id)
};

export const dbOrderItems = {
  getForOrders: (orderIds: string[]) =>
    orderIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)
          .neq('status', 'cancelled')
          .order('created_at'),
  markPrinted: (itemIds: string[]) => 
    supabase.from('order_items').update({ is_printed: true }).in('id', itemIds),
  insert: (item: {
    order_id: string;
    menu_item_id?: string;
    name: string;
    price: number;
    qty: number;
    variant_label?: string;
    notes?: string;
  }) =>
    supabase.from('order_items').insert({
      order_id: item.order_id,
      menu_item_id: item.menu_item_id || null,
      name: item.name,
      price: item.price,
      qty: item.qty,
      variant_label: item.variant_label || null,
      notes: item.notes || null,
      status: 'pending',
    }).select().single(),
  cancel: (id: string) =>
    supabase.from('order_items').update({ status: 'cancelled' }).eq('id', id),
  markDone: (id: string) =>
    supabase.from('order_items').update({ status: 'done' }).eq('id', id),
  updateNotes: (id: string, notes: string) =>
    supabase.from('order_items').update({ notes }).eq('id', id),
  getRanking: ({ start, end }: { start?: string, end?: string }) => {
    let query = supabase
      .from('order_items')
      .select('name, qty, orders!inner(status, closed_at)')
      .in('orders.status', ['closed', 'archived']);
    
    if (start) query = query.gte('orders.closed_at', start);
    if (end) query = query.lte('orders.closed_at', end);
    
    return query;
  }
};

export const dbMenu = {
  getAll: () =>
    supabase
      .from('menu_items')
      .select('*, category_id, menu_categories(id, name), menu_item_variants(*)')
      .order('name'),
  toggleActive: (id: string, active: boolean) =>
    supabase.from('menu_items').update({ active }).eq('id', id),
  toggleVariantActive: (id: string, active: boolean) =>
    supabase.from('menu_item_variants').update({ active }).eq('id', id),
  updateItem: (id: string, name: string, price: number) =>
    supabase.from('menu_items').update({ name, price }).eq('id', id),
  updateVariant: (id: string, label: string, price: number) =>
    supabase.from('menu_item_variants').update({ label, price }).eq('id', id),
  insertItem: (item: { name: string; price: number; category_id: string; has_variants: boolean; active: boolean }) =>
    supabase.from('menu_items').insert(item).select().single(),
  insertVariant: (variant: { menu_item_id: string; label: string; price: number; active: boolean; sort_order: number }) =>
    supabase.from('menu_item_variants').insert(variant).select().single(),
};

export const dbCategories = {
  updateName: (id: string, name: string) =>
    supabase.from('menu_categories').update({ name }).eq('id', id),
  insert: (name: string) =>
    supabase.from('menu_categories').insert({ name }).select().single(),
};

export const dbUsers = {
  getAll: () => supabase.from('users').select('*').order('name'),
  insert: (name: string, role: UserRow['role'], password: string) =>
    supabase.from('users').insert({ name, role, password, active: true, session_active: false }),
  delete: (id: string) =>
    supabase.from('users').delete().eq('id', id),
  update: (id: string, name: string, role: string) =>
    supabase.from('users').update({ name, role }).eq('id', id),
  setSessionActive: (id: string, active: boolean) =>
    supabase.from('users').update({ session_active: active }).eq('id', id),
  closeSession: (id: string) =>
    supabase.from('users').update({ session_active: false }).eq('id', id),
};

export const dbExpenses = {
  insert: (amount: number, concept: string, detail: string) => {
    const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mazatlan'}).format(new Date());
    return supabase.from('expenses').insert({ amount, concept, detail: detail || null, expense_date: today, status: 'active' });
  },
  getToday: () => {
    return supabase.from('expenses').select('*').eq('status', 'active');
  },
  archiveExpenses: (ids: string[]) =>
    supabase.from('expenses').update({ status: 'archived' }).in('id', ids),
};

export const dbShiftSummaries = {
  getAll: () => supabase.from('shift_summaries').select('*').order('created_at', { ascending: false }),
  insert: (summary: {
    income: number;
    cash_income: number;
    cash_tips: number;
    debit_income: number;
    debit_tips: number;
    credit_income: number;
    credit_tips: number;
    transfer_income: number;
    transfer_tips: number;
    card_income: number;
    card_tips: number;
    expenses: number;
    accounts_count: number;
    expenses_list: any[];
    hotel_income: number;
    hotel_card_income: number;
    hotel_cash_income: number;
    closed_by: string;
    [key: string]: any;
  }) => supabase.from('shift_summaries').insert(summary).select().single(),


  getFiltered: ({ start, end }: { start?: string, end?: string }) => {
    let query = supabase.from('shift_summaries').select('*').order('created_at', { ascending: false });
    if (start) query = query.gte('created_at', start);
    if (end) query = query.lte('created_at', end);
    return query;
  },
  delete: (id: string) => supabase.from('shift_summaries').delete().eq('id', id),
};

export const dbPrintedTickets = {
  insert: (tableId: number, printedBy: string, total: number, itemsSummary: string) =>
    supabase.from('printed_tickets').insert({
      table_id: tableId,
      printed_by: printedBy,
      total,
      items_summary: itemsSummary
    }).select().single(),
  getToday: () => {
    return supabase.from('printed_tickets')
      .select('*')
      .order('created_at', { ascending: true });
  },
  markPrinted: (id: number) => 
    supabase.from('printed_tickets').update({ status: 'printed' }).eq('id', id),
  delete: (id: number) =>
    supabase.from('printed_tickets').delete().eq('id', id)
};

export const dbHotelSales = {
  archiveSales: (ids: string[]) =>
    supabase.from('hotel_sales').update({ status: 'archived' }).in('id', ids),
};

