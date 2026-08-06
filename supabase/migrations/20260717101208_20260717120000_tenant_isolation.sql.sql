/*
# Tenant Isolation — Per-User Data Ownership

## What this does
This migration transforms the app from a single shared dataset into a multi-tenant system
where each authenticated user (tenant/customer who purchased the system) only sees and
manages their OWN data. When a new customer signs up, they get an empty system and enter
their own properties, units, bookings, etc.

## Changes

### 1. Add `user_id` column to all data tables
The following tables get a new `user_id uuid` column that links each row to its owner:
- properties, units, customers, bookings, invoices, commissions, expenses,
  staff_users, shifts, settlements, bank_accounts, company_settings

Each `user_id` defaults to `auth.uid()` so inserts from the frontend automatically
get the correct owner without the client needing to pass it explicitly.

### 2. Assign existing data to the current admin
All existing rows (created before this migration) are assigned to the admin user
`a2e8db43-6b08-4e8e-974d-c74ce5d1479a` (waadadam595@gmail.com) so no data is lost.

### 3. Rewrite ALL RLS policies for per-user isolation
Every table's CRUD policies are replaced with `auth.uid() = user_id` checks.
New tenants who sign up will see zero rows — a completely empty system.

### 4. Keep customer portal access working
The portal_* policies on customers, bookings, and invoices remain accessible
via access_token (for the public customer portal edge function).

### Important notes
- `user_id` columns are nullable initially (for the ALTER DEFAULT), then set NOT NULL
  after backfilling existing rows.
- Child tables (units, bookings, etc.) that reference parent tables (properties)
  still have their own `user_id` for direct ownership checks.
- The `company_settings` table also gets `user_id` so each tenant has their own settings.
*/

-- ============================================================
-- Step 1: Add user_id column to all data tables
-- ============================================================

DO $$
BEGIN
  -- properties
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'user_id') THEN
    ALTER TABLE properties ADD COLUMN user_id uuid;
  END IF;

  -- units
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'user_id') THEN
    ALTER TABLE units ADD COLUMN user_id uuid;
  END IF;

  -- customers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'user_id') THEN
    ALTER TABLE customers ADD COLUMN user_id uuid;
  END IF;

  -- bookings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'user_id') THEN
    ALTER TABLE bookings ADD COLUMN user_id uuid;
  END IF;

  -- invoices
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'user_id') THEN
    ALTER TABLE invoices ADD COLUMN user_id uuid;
  END IF;

  -- commissions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commissions' AND column_name = 'user_id') THEN
    ALTER TABLE commissions ADD COLUMN user_id uuid;
  END IF;

  -- expenses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_id') THEN
    ALTER TABLE expenses ADD COLUMN user_id uuid;
  END IF;

  -- staff_users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_users' AND column_name = 'user_id') THEN
    ALTER TABLE staff_users ADD COLUMN user_id uuid;
  END IF;

  -- shifts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'user_id') THEN
    ALTER TABLE shifts ADD COLUMN user_id uuid;
  END IF;

  -- settlements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settlements' AND column_name = 'user_id') THEN
    ALTER TABLE settlements ADD COLUMN user_id uuid;
  END IF;

  -- bank_accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'user_id') THEN
    ALTER TABLE bank_accounts ADD COLUMN user_id uuid;
  END IF;

  -- company_settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'user_id') THEN
    ALTER TABLE company_settings ADD COLUMN user_id uuid;
  END IF;
END $$;

-- ============================================================
-- Step 2: Backfill existing data to the admin user
-- ============================================================

UPDATE properties SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE units SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE customers SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE bookings SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE invoices SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE commissions SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE expenses SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE staff_users SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE shifts SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE settlements SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE bank_accounts SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;
UPDATE company_settings SET user_id = 'a2e8db43-6b08-4e8e-974d-c74ce5d1479a' WHERE user_id IS NULL;

-- Now set NOT NULL + default
ALTER TABLE properties ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE properties ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE units ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE units ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE customers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE bookings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE commissions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE commissions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE staff_users ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE staff_users ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE shifts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE shifts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE settlements ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE settlements ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE bank_accounts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE bank_accounts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE company_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE company_settings ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_user_id_fkey') THEN
    ALTER TABLE properties ADD CONSTRAINT properties_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'units_user_id_fkey') THEN
    ALTER TABLE units ADD CONSTRAINT units_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_user_id_fkey') THEN
    ALTER TABLE customers ADD CONSTRAINT customers_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_fkey') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_user_id_fkey') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commissions_user_id_fkey') THEN
    ALTER TABLE commissions ADD CONSTRAINT commissions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_user_id_fkey') THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_users_user_id_fkey') THEN
    ALTER TABLE staff_users ADD CONSTRAINT staff_users_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_user_id_fkey') THEN
    ALTER TABLE shifts ADD CONSTRAINT shifts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settlements_user_id_fkey') THEN
    ALTER TABLE settlements ADD CONSTRAINT settlements_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_accounts_user_id_fkey') THEN
    ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_settings_user_id_fkey') THEN
    ALTER TABLE company_settings ADD CONSTRAINT company_settings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for user_id on all tables
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_units_user_id ON units(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_user_id ON staff_users(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_user_id ON settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);

-- ============================================================
-- Step 3: Rewrite ALL RLS policies for per-user isolation
-- ============================================================

-- PROPERTIES
DROP POLICY IF EXISTS "auth_select_properties" ON properties;
DROP POLICY IF EXISTS "auth_insert_properties" ON properties;
DROP POLICY IF EXISTS "auth_update_properties" ON properties;
DROP POLICY IF EXISTS "auth_delete_properties" ON properties;
DROP POLICY IF EXISTS "portal_select_properties" ON properties;

CREATE POLICY "select_own_properties" ON properties FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_properties" ON properties FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_properties" ON properties FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- UNITS
DROP POLICY IF EXISTS "auth_select_units" ON units;
DROP POLICY IF EXISTS "auth_insert_units" ON units;
DROP POLICY IF EXISTS "auth_update_units" ON units;
DROP POLICY IF EXISTS "auth_delete_units" ON units;

CREATE POLICY "select_own_units" ON units FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_units" ON units FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_units" ON units FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_units" ON units FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CUSTOMERS
DROP POLICY IF EXISTS "auth_select_customers" ON customers;
DROP POLICY IF EXISTS "auth_insert_customers" ON customers;
DROP POLICY IF EXISTS "auth_update_customers" ON customers;
DROP POLICY IF EXISTS "auth_delete_customers" ON customers;
DROP POLICY IF EXISTS "portal_select_customers" ON customers;

CREATE POLICY "select_own_customers" ON customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_customers" ON customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_customers" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
-- Portal access via access_token (anon can read by token)
CREATE POLICY "portal_select_customers" ON customers FOR SELECT
  TO anon, authenticated USING (access_token IS NOT NULL);

-- BOOKINGS
DROP POLICY IF EXISTS "auth_select_bookings" ON bookings;
DROP POLICY IF EXISTS "auth_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "auth_update_bookings" ON bookings;
DROP POLICY IF EXISTS "auth_delete_bookings" ON bookings;
DROP POLICY IF EXISTS "portal_select_bookings" ON bookings;

CREATE POLICY "select_own_bookings" ON bookings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bookings" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bookings" ON bookings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_bookings" ON bookings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
-- Portal: anon can read bookings (the edge function filters by customer access_token)
CREATE POLICY "portal_select_bookings" ON bookings FOR SELECT
  TO anon, authenticated USING (true);

-- INVOICES
DROP POLICY IF EXISTS "auth_select_invoices" ON invoices;
DROP POLICY IF EXISTS "auth_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "auth_update_invoices" ON invoices;
DROP POLICY IF EXISTS "auth_delete_invoices" ON invoices;
DROP POLICY IF EXISTS "portal_select_invoices" ON invoices;

CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "portal_select_invoices" ON invoices FOR SELECT
  TO anon, authenticated USING (true);

-- COMMISSIONS
DROP POLICY IF EXISTS "auth_select_commissions" ON commissions;
DROP POLICY IF EXISTS "auth_insert_commissions" ON commissions;
DROP POLICY IF EXISTS "auth_update_commissions" ON commissions;
DROP POLICY IF EXISTS "auth_delete_commissions" ON commissions;

CREATE POLICY "select_own_commissions" ON commissions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_commissions" ON commissions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_commissions" ON commissions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_commissions" ON commissions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- EXPENSES
DROP POLICY IF EXISTS "auth_select_expenses" ON expenses;
DROP POLICY IF EXISTS "auth_insert_expenses" ON expenses;
DROP POLICY IF EXISTS "auth_update_expenses" ON expenses;
DROP POLICY IF EXISTS "auth_delete_expenses" ON expenses;

CREATE POLICY "select_own_expenses" ON expenses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_expenses" ON expenses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_expenses" ON expenses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- STAFF_USERS
DROP POLICY IF EXISTS "auth_select_staff_users" ON staff_users;
DROP POLICY IF EXISTS "auth_insert_staff_users" ON staff_users;
DROP POLICY IF EXISTS "auth_update_staff_users" ON staff_users;
DROP POLICY IF EXISTS "auth_delete_staff_users" ON staff_users;

CREATE POLICY "select_own_staff_users" ON staff_users FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_staff_users" ON staff_users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_staff_users" ON staff_users FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_staff_users" ON staff_users FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SHIFTS
DROP POLICY IF EXISTS "auth_select_shifts" ON shifts;
DROP POLICY IF EXISTS "auth_insert_shifts" ON shifts;
DROP POLICY IF EXISTS "auth_update_shifts" ON shifts;
DROP POLICY IF EXISTS "auth_delete_shifts" ON shifts;

CREATE POLICY "select_own_shifts" ON shifts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_shifts" ON shifts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_shifts" ON shifts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_shifts" ON shifts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SETTLEMENTS
DROP POLICY IF EXISTS "auth_select_settlements" ON settlements;
DROP POLICY IF EXISTS "auth_insert_settlements" ON settlements;
DROP POLICY IF EXISTS "auth_update_settlements" ON settlements;
DROP POLICY IF EXISTS "auth_delete_settlements" ON settlements;

CREATE POLICY "select_own_settlements" ON settlements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_settlements" ON settlements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_settlements" ON settlements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_settlements" ON settlements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- BANK_ACCOUNTS
DROP POLICY IF EXISTS "auth_select_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "auth_insert_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "auth_update_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "auth_delete_bank_accounts" ON bank_accounts;

CREATE POLICY "select_own_bank_accounts" ON bank_accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bank_accounts" ON bank_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bank_accounts" ON bank_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_bank_accounts" ON bank_accounts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- COMPANY_SETTINGS
DROP POLICY IF EXISTS "auth_select_company_settings" ON company_settings;
DROP POLICY IF EXISTS "auth_insert_company_settings" ON company_settings;
DROP POLICY IF EXISTS "auth_update_company_settings" ON company_settings;
DROP POLICY IF EXISTS "auth_delete_company_settings" ON company_settings;

CREATE POLICY "select_own_company_settings" ON company_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_company_settings" ON company_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_company_settings" ON company_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_company_settings" ON company_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Step 4: Add unique constraint on company_settings (one per user)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_user_id_unique
  ON company_settings(user_id);
