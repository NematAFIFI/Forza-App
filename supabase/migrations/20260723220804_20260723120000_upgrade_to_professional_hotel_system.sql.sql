/*
# Upgrade to Professional Hotel Management System

## Overview
Transforms the existing basic hotel system into a full professional hotel management platform with modular architecture.

## New Tables
1. `room_types` — Room categories with base pricing
2. `services` — Additional hotel services (restaurant, laundry, room service, minibar)
3. `service_orders` — Orders for additional services linked to guest bookings
4. `payments` — Individual payment records with multiple payment methods
5. `branches` — Multi-branch/multi-hotel support
6. `stay_history` — Guest stay history log

## Modified Tables (additive only)
- `units`, `bookings`, `customers`, `invoices`, `staff_users`, `company_settings`

## Security
- RLS enabled on all new tables with authenticated-only access
*/

-- ============================================================
-- 1. BRANCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  city text,
  country text DEFAULT 'السعودية',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_branches" ON branches;
CREATE POLICY "select_own_branches" ON branches FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_branches" ON branches;
CREATE POLICY "insert_own_branches" ON branches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_branches" ON branches;
CREATE POLICY "update_own_branches" ON branches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_branches" ON branches;
CREATE POLICY "delete_own_branches" ON branches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 2. ROOM_TYPES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price numeric DEFAULT 0,
  base_monthly_price numeric DEFAULT 0,
  max_occupancy integer DEFAULT 2,
  amenities text[],
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_room_types" ON room_types;
CREATE POLICY "select_own_room_types" ON room_types FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_room_types" ON room_types;
CREATE POLICY "insert_own_room_types" ON room_types FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_room_types" ON room_types;
CREATE POLICY "update_own_room_types" ON room_types FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_room_types" ON room_types;
CREATE POLICY "delete_own_room_types" ON room_types FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 3. SERVICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'restaurant',
  price numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_services" ON services;
CREATE POLICY "select_own_services" ON services FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_services" ON services;
CREATE POLICY "insert_own_services" ON services FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_services" ON services;
CREATE POLICY "update_own_services" ON services FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_services" ON services;
CREATE POLICY "delete_own_services" ON services FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 4. SERVICE_ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  service_name text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  order_status text DEFAULT 'pending',
  order_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_service_orders" ON service_orders;
CREATE POLICY "select_own_service_orders" ON service_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_service_orders" ON service_orders;
CREATE POLICY "insert_own_service_orders" ON service_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_service_orders" ON service_orders;
CREATE POLICY "update_own_service_orders" ON service_orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_service_orders" ON service_orders;
CREATE POLICY "delete_own_service_orders" ON service_orders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 5. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 6. STAY_HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS stay_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  check_in date,
  check_out date,
  num_nights integer,
  total_amount numeric DEFAULT 0,
  rating integer,
  feedback text,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE stay_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_stay_history" ON stay_history;
CREATE POLICY "select_own_stay_history" ON stay_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_stay_history" ON stay_history;
CREATE POLICY "insert_own_stay_history" ON stay_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_stay_history" ON stay_history;
CREATE POLICY "update_own_stay_history" ON stay_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_stay_history" ON stay_history;
CREATE POLICY "delete_own_stay_history" ON stay_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 7. ADD COLUMNS TO EXISTING TABLES
-- ============================================================

-- units
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='room_type_id') THEN
    ALTER TABLE units ADD COLUMN room_type_id uuid REFERENCES room_types(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='branch_id') THEN
    ALTER TABLE units ADD COLUMN branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='cleaning_status') THEN
    ALTER TABLE units ADD COLUMN cleaning_status text DEFAULT 'clean';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='units' AND column_name='last_cleaned_at') THEN
    ALTER TABLE units ADD COLUMN last_cleaned_at timestamptz;
  END IF;
END $$;

-- bookings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='booking_type') THEN
    ALTER TABLE bookings ADD COLUMN booking_type text DEFAULT 'direct';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='num_nights') THEN
    ALTER TABLE bookings ADD COLUMN num_nights integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='check_in_time') THEN
    ALTER TABLE bookings ADD COLUMN check_in_time text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='check_out_time') THEN
    ALTER TABLE bookings ADD COLUMN check_out_time text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='cancelled_at') THEN
    ALTER TABLE bookings ADD COLUMN cancelled_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='cancellation_reason') THEN
    ALTER TABLE bookings ADD COLUMN cancellation_reason text;
  END IF;
END $$;

-- customers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='id_type') THEN
    ALTER TABLE customers ADD COLUMN id_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='id_expiry') THEN
    ALTER TABLE customers ADD COLUMN id_expiry date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='date_of_birth') THEN
    ALTER TABLE customers ADD COLUMN date_of_birth date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='vip_status') THEN
    ALTER TABLE customers ADD COLUMN vip_status boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='total_stays') THEN
    ALTER TABLE customers ADD COLUMN total_stays integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='total_spent') THEN
    ALTER TABLE customers ADD COLUMN total_spent numeric DEFAULT 0;
  END IF;
END $$;

-- invoices
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='vat_number') THEN
    ALTER TABLE invoices ADD COLUMN vat_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='zatca_uuid') THEN
    ALTER TABLE invoices ADD COLUMN zatca_uuid text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='zatca_status') THEN
    ALTER TABLE invoices ADD COLUMN zatca_status text DEFAULT 'not_submitted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='branch_id') THEN
    ALTER TABLE invoices ADD COLUMN branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- staff_users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='branch_id') THEN
    ALTER TABLE staff_users ADD COLUMN branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='permissions') THEN
    ALTER TABLE staff_users ADD COLUMN permissions jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='can_manage_bookings') THEN
    ALTER TABLE staff_users ADD COLUMN can_manage_bookings boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='can_manage_invoices') THEN
    ALTER TABLE staff_users ADD COLUMN can_manage_invoices boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='can_manage_inventory') THEN
    ALTER TABLE staff_users ADD COLUMN can_manage_inventory boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='can_view_reports') THEN
    ALTER TABLE staff_users ADD COLUMN can_view_reports boolean DEFAULT false;
  END IF;
END $$;

-- company_settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='branch_id') THEN
    ALTER TABLE company_settings ADD COLUMN branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='booking_policy') THEN
    ALTER TABLE company_settings ADD COLUMN booking_policy text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='cancellation_policy') THEN
    ALTER TABLE company_settings ADD COLUMN cancellation_policy text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='check_in_time') THEN
    ALTER TABLE company_settings ADD COLUMN check_in_time text DEFAULT '14:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='check_out_time') THEN
    ALTER TABLE company_settings ADD COLUMN check_out_time text DEFAULT '12:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='auto_backup_enabled') THEN
    ALTER TABLE company_settings ADD COLUMN auto_backup_enabled boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='backup_frequency') THEN
    ALTER TABLE company_settings ADD COLUMN backup_frequency text DEFAULT 'daily';
  END IF;
END $$;

-- ============================================================
-- 8. DUPLICATE BOOKING PREVENTION
-- ============================================================
DROP INDEX IF EXISTS unique_booking_prevention;
CREATE UNIQUE INDEX IF NOT EXISTS unique_booking_prevention
  ON bookings (unit_id, check_in, check_out)
  WHERE booking_status NOT IN ('cancelled');

-- ============================================================
-- 9. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_unit_dates ON bookings(unit_id, check_in, check_out) WHERE booking_status NOT IN ('cancelled');
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_booking ON service_orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_branch ON units(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
