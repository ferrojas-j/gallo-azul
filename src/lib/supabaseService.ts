import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────
export type TableRow = {
  id: number;
  status: 'free' | 'occupied' | 'paying';
  capacity: number;
  notes: string | null;
};

export type OrderRow = {
  id: string;
  table_id: number;
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
  getAll: () => supabase.from('tables').select('*').order('id'),
  updateStatus: (id: number, status: TableRow['status']) =>
    supabase.from('tables').update({ status }).eq('id', id),
  insert: (id: number) =>
    supabase.from('tables').insert({ id, status: 'free', capacity: 4 }),
  delete: (id: number) =>
    supabase.from('tables').delete().eq('id', id),
};

export const dbOrders = {
  getActive: () =>
    supabase.from('orders').select('*').in('status', ['open', 'paying']),
  getForTable: (tableId: number) =>
    supabase.from('orders').select('*').eq('table_id', tableId).in('status', ['open', 'paying']).maybeSingle(),
  create: (tableId: number) =>
    supabase.from('orders').insert({ table_id: tableId, status: 'open' }).select().single(),
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
  getTodayIncome: () => {
    const today = new Date().toISOString().split('T')[0];
    return supabase
      .from('orders')
      .select('total, tip')
      .eq('status', 'closed') // ONLY actively closed orders from this turn
      .gte('closed_at', today + 'T00:00:00');
  },
  getTodayClosedOrders: () => {
    const today = new Date().toISOString().split('T')[0];
    return supabase
      .from('orders')
      .select('*')
      .eq('status', 'closed')
      .gte('closed_at', today + 'T00:00:00')
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
    const today = new Date().toISOString().split('T')[0];
    return supabase.from('expenses').insert({ amount, concept, detail: detail || null, expense_date: today, status: 'active' });
  },
  getToday: () => {
    const today = new Date().toISOString().split('T')[0];
    return supabase.from('expenses').select('*').eq('expense_date', today).eq('status', 'active');
  },
  archiveExpenses: (ids: number[]) =>
    supabase.from('expenses').update({ status: 'archived' }).in('id', ids),
};

export const dbShiftSummaries = {
  getAll: () => supabase.from('shift_summaries').select('*').order('created_at', { ascending: false }),
  insert: (summary: {
    income: number;
    cash_income: number;
    transfer_income: number;
    transfer_tips: number;
    expenses: number;
    accounts_count: number;
    expenses_list: any[];
    closed_by: string;
  }) => supabase.from('shift_summaries').insert(summary).select().single(),
  getFiltered: ({ start, end }: { start?: string, end?: string }) => {
    let query = supabase.from('shift_summaries').select('*').order('created_at', { ascending: false });
    if (start) query = query.gte('created_at', start);
    if (end) query = query.lte('created_at', end);
    return query;
  },
  delete: (id: string) => supabase.from('shift_summaries').delete().eq('id', id),
};
