/*
# Fix Portal Policies Leaking Data to Authenticated Users

## Problem
The portal_* policies (portal_select_bookings, portal_select_units, portal_select_settings)
were scoped to `TO anon, authenticated USING (true)`. In Supabase RLS, if ANY policy
grants access, the row is visible. So even though `select_own_*` policies restrict to
`auth.uid() = user_id`, the portal policies with `USING (true)` granted ALL authenticated
users access to ALL rows.

## Fix
Change all portal_* policies to `TO anon` only. The customer-portal edge function
uses the anon key, so it can still read via these policies. Authenticated dashboard
users will only get access through the `select_own_*` ownership policies.
*/

-- BOOKINGS: restrict portal to anon only
DROP POLICY IF EXISTS "portal_select_bookings" ON bookings;
CREATE POLICY "portal_select_bookings" ON bookings FOR SELECT
  TO anon USING (true);

-- UNITS: restrict portal to anon only
DROP POLICY IF EXISTS "portal_select_units" ON units;
CREATE POLICY "portal_select_units" ON units FOR SELECT
  TO anon USING (true);

-- COMPANY_SETTINGS: restrict portal to anon only
DROP POLICY IF EXISTS "portal_select_settings" ON company_settings;
CREATE POLICY "portal_select_settings" ON company_settings FOR SELECT
  TO anon USING (true);

-- CUSTOMERS: remove duplicate portal policy, keep one scoped to anon
DROP POLICY IF EXISTS "portal_select_customers" ON customers;
DROP POLICY IF EXISTS "portal_select_by_token" ON customers;
CREATE POLICY "portal_select_by_token" ON customers FOR SELECT
  TO anon USING (access_token IS NOT NULL);

-- INVOICES: restrict portal to anon only
DROP POLICY IF EXISTS "portal_select_invoices" ON invoices;
CREATE POLICY "portal_select_invoices" ON invoices FOR SELECT
  TO anon USING (true);
