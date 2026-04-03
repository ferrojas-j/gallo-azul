import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// =============================================
// TIPOS basados en el schema de Supabase
// =============================================

export type DbUser = {
  id: string;
  name: string;
  role: 'Administrador' | 'Mesero' | 'Cajero';
  pin: string | null;
  active: boolean;
  session_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTable = {
  id: number;
  status: 'free' | 'occupied' | 'paying';
  capacity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DbMenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type DbMenuItem = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbOrder = {
  id: string;
  table_id: number;
  user_id: string | null;
  status: 'open' | 'paying' | 'closed' | 'cancelled';
  payment_method: 'efectivo' | 'transferencia' | 'tarjeta' | null;
  total: number;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  qty: number;
  notes: string | null;
  status: 'pending' | 'done' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type DbExpense = {
  id: string;
  amount: number;
  concept: 'Pago a proveedores' | 'Compra de insumos' | 'Otro';
  detail: string | null;
  registered_by: string | null;
  expense_date: string;
  created_at: string;
};

export type DbDailySummary = {
  id: string;
  summary_date: string;
  total_income: number;
  total_expenses: number;
  net: number;
  total_orders: number;
  closed_by: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
};
