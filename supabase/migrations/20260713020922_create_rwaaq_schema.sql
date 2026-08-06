/*
# Create Rawaaq (رواق) Hotel & Serviced Apartments Management System Schema

## Overview
This migration creates the complete database schema for the Rawaaq hotel and serviced apartments management system.
It is a single-tenant application (no authentication screen), so all policies use `TO anon, authenticated`.

## New Tables

1. **properties** — العقارات (hotels and apartment buildings)
   - id, name, type (hotel/serviced_apartments), address, phone, email, total_units, notes, created_at

2. **units** — الوحدات (rooms and apartments)
   - id, property_id (FK → properties), unit_number, unit_type (room/apartment_suite/studio), floor, capacity, daily_rate, monthly_rate, status (available/reserved/maintenance/cleaning), notes, created_at

3. **customers** — العملاء
   - id, name, phone, email, id_number, nationality, address, notes, created_at

4. **bookings** — الحجوزات
   - id, unit_id (FK → units), customer_id (FK → customers), check_in, check_out, booking_status (pending/confirmed/checked_in/checked_out/cancelled), total_amount, paid_amount, commission_rate, commission_amount, booking_source, notes, created_at

5. **invoices** — الفواتير
   - id, booking_id (FK → bookings), customer_id (FK → customers), invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, paid_amount, payment_status (paid/unpaid/partial), payment_method, notes, created_at

6. **expenses** — المصروفات
   - id, property_id (FK → properties, nullable), category, description, amount, expense_date, payment_method, created_at

7. **commissions** — العمولات
   - id, booking_id (FK → bookings), agent_name, commission_rate, commission_amount, commission_status (pending/paid), paid_date, created_at

8. **staff_users** — المستخدمون (staff management)
   - id, name, role (admin/manager/receptionist/accountant/housekeeper), phone, email, status (active/inactive), hire_date, created_at

9. **shifts** — الشفتات
   - id, staff_id (FK → staff_users), shift_date, start_time, end_time, shift_type (morning/evening/night), status (scheduled/active/completed), notes, created_at

## Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because this is a single-tenant commercial product with no sign-in screen — all data is intentionally shared.
- 4 policies per table (select/insert/update/delete).

## Notes
1. All monetary columns use numeric(12,2) for precision.
2. Timestamps default to now().
3. Foreign keys use ON DELETE CASCADE for child tables to maintain referential integrity.
4. Indexes created on frequently-queried columns (foreign keys, status fields, dates).
*/

-- ============================================================
-- 1. PROPERTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  property_type text NOT NULL DEFAULT 'hotel' CHECK (property_type IN ('hotel', 'serviced_apartments')),
  address text,
  phone text,
  email text,
  total_units integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_properties" ON properties;
CREATE POLICY "anon_select_properties" ON properties FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_properties" ON properties;
CREATE POLICY "anon_insert_properties" ON properties FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_properties" ON properties;
CREATE POLICY "anon_update_properties" ON properties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_properties" ON properties;
CREATE POLICY "anon_delete_properties" ON properties FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 2. UNITS
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  unit_type text NOT NULL DEFAULT 'room' CHECK (unit_type IN ('room', 'apartment_suite', 'studio')),
  floor integer DEFAULT 1,
  capacity integer DEFAULT 2,
  daily_rate numeric(12,2) DEFAULT 0,
  monthly_rate numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'maintenance', 'cleaning')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_units" ON units;
CREATE POLICY "anon_select_units" ON units FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_units" ON units;
CREATE POLICY "anon_insert_units" ON units FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_units" ON units;
CREATE POLICY "anon_update_units" ON units FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_units" ON units;
CREATE POLICY "anon_delete_units" ON units FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

-- ============================================================
-- 3. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  id_number text,
  nationality text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 4. BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  check_in date NOT NULL,
  check_out date NOT NULL,
  booking_status text NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  total_amount numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  commission_rate numeric(5,2) DEFAULT 0,
  commission_amount numeric(12,2) DEFAULT 0,
  booking_source text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bookings" ON bookings;
CREATE POLICY "anon_update_bookings" ON bookings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_bookings" ON bookings;
CREATE POLICY "anon_delete_bookings" ON bookings FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_bookings_unit_id ON bookings(unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);

-- ============================================================
-- 5. INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number text,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(12,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- ============================================================
-- 6. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date DEFAULT CURRENT_DATE,
  payment_method text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- ============================================================
-- 7. COMMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agent_name text,
  commission_rate numeric(5,2) DEFAULT 0,
  commission_amount numeric(12,2) DEFAULT 0,
  commission_status text NOT NULL DEFAULT 'pending' CHECK (commission_status IN ('pending', 'paid')),
  paid_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_commissions" ON commissions;
CREATE POLICY "anon_select_commissions" ON commissions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_commissions" ON commissions;
CREATE POLICY "anon_insert_commissions" ON commissions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_commissions" ON commissions;
CREATE POLICY "anon_update_commissions" ON commissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_commissions" ON commissions;
CREATE POLICY "anon_delete_commissions" ON commissions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_commissions_booking_id ON commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(commission_status);

-- ============================================================
-- 8. STAFF USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'receptionist' CHECK (role IN ('admin', 'manager', 'receptionist', 'accountant', 'housekeeper')),
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  hire_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_staff_users" ON staff_users;
CREATE POLICY "anon_select_staff_users" ON staff_users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_staff_users" ON staff_users;
CREATE POLICY "anon_insert_staff_users" ON staff_users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_staff_users" ON staff_users;
CREATE POLICY "anon_update_staff_users" ON staff_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_staff_users" ON staff_users;
CREATE POLICY "anon_delete_staff_users" ON staff_users FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 9. SHIFTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  shift_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time,
  end_time time,
  shift_type text NOT NULL DEFAULT 'morning' CHECK (shift_type IN ('morning', 'evening', 'night')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_shifts" ON shifts;
CREATE POLICY "anon_select_shifts" ON shifts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shifts" ON shifts;
CREATE POLICY "anon_insert_shifts" ON shifts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shifts" ON shifts;
CREATE POLICY "anon_update_shifts" ON shifts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shifts" ON shifts;
CREATE POLICY "anon_delete_shifts" ON shifts FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
