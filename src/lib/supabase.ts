import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ===== Types =====

export interface CompanySettings {
  id: string;
  company_name: string | null;
  legal_name: string | null;
  cr_number: string | null;
  vat_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  currency: string | null;
  tax_rate: number | null;
  invoice_prefix: string | null;
  footer_note: string | null;
  booking_policy: string | null;
  cancellation_policy: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  auto_backup_enabled: boolean | null;
  backup_frequency: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  id_type: string | null;
  id_expiry: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  notes: string | null;
  vip_status: boolean | null;
  access_token: string | null;
  total_stays: number | null;
  total_spent: number | null;
  archived: boolean | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type RoomType = 'single' | 'double' | 'suite' | 'family' | 'royal';

export interface Property {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  archived: boolean | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Unit {
  id: string;
  unit_number: string | null;
  unit_type: string | null;
  floor: number | null;
  capacity: number | null;
  daily_rate: number | null;
  monthly_rate: number | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  property_id?: string | null;
  room_type_id?: string | null;
  branch_id?: string | null;
  cleaning_status?: string | null;
  last_cleaned_at?: string | null;
  archived: boolean | null;
  archived_at: string | null;
  property?: Property | null;
}

export interface Booking {
  id: string;
  unit_id: string | null;
  customer_id: string | null;
  check_in: string | null;
  check_out: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  booking_type: string | null;
  booking_source: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  num_nights: number | null;
  booking_status: string | null;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  archived: boolean | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  unit?: Unit | null;
  customer?: Customer | null;
  property?: Property | null;
}

export interface Invoice {
  id: string;
  customer_id: string | null;
  booking_id?: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  discount: number | null;
  total: number | null;
  paid_amount: number | null;
  payment_status: string | null;
  payment_method: string | null;
  notes: string | null;
  zatca_status: string | null;
  archived: boolean | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  customer?: Customer | null;
  booking?: Booking | null;
}

export interface Service {
  id: string;
  name: string | null;
  category: string | null;
  price: number | null;
  description: string | null;
  is_active: boolean | null;
  stock: number | null;
  low_stock_threshold: number | null;
  archived: boolean | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InventoryWithdrawal {
  id: string;
  service_id: string;
  quantity: number;
  reason: string | null;
  user_id: string;
  created_at: string | null;
  service?: Service | null;
}

export interface ServiceOrder {
  id: string;
  service_id: string | null;
  booking_id: string | null;
  customer_id: string | null;
  quantity: number | null;
  total_price: number | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  service?: Service | null;
  customer?: Customer | null;
  booking?: Booking | null;
}

export interface Payment {
  id: string;
  invoice_id: string | null;
  booking_id?: string | null;
  customer_id?: string | null;
  amount: number | null;
  payment_method: string | null;
  payment_date: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface Branch {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  created_at: string | null;
}

export interface StaffUser {
  id: string;
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  hire_date: string | null;
  can_manage_bookings: boolean | null;
  can_manage_invoices: boolean | null;
  can_manage_inventory: boolean | null;
  can_view_reports: boolean | null;
  archived: boolean | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StayHistory {
  customer_id: string;
  total_stays: number;
  total_spent: number;
  last_stay_date: string | null;
}
