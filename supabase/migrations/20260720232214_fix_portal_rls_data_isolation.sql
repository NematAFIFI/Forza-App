-- Fix: Portal policies with USING(true) were leaking all data to authenticated users
-- because "authenticated" inherits from "anon" in Supabase, so "TO anon" policies
-- also apply to authenticated users, and OR-ing "true" with the ownership check
-- makes the ownership check useless.
--
-- Fix: add "auth.uid() IS NULL" to portal policies so they only apply to
-- unauthenticated (anon) requests from the customer portal, never to
-- logged-in users.

-- bookings
DROP POLICY IF EXISTS "portal_select_bookings" ON bookings;
CREATE POLICY "portal_select_bookings" ON bookings FOR SELECT
  TO anon USING (auth.uid() IS NULL);

-- units
DROP POLICY IF EXISTS "portal_select_units" ON units;
CREATE POLICY "portal_select_units" ON units FOR SELECT
  TO anon USING (auth.uid() IS NULL);

-- invoices
DROP POLICY IF EXISTS "portal_select_invoices" ON invoices;
CREATE POLICY "portal_select_invoices" ON invoices FOR SELECT
  TO anon USING (auth.uid() IS NULL);

-- company_settings
DROP POLICY IF EXISTS "portal_select_settings" ON company_settings;
CREATE POLICY "portal_select_settings" ON company_settings FOR SELECT
  TO anon USING (auth.uid() IS NULL);

-- customers: tighten the existing token-based portal policy so it also
-- requires no authenticated user
DROP POLICY IF EXISTS "portal_select_by_token" ON customers;
CREATE POLICY "portal_select_by_token" ON customers FOR SELECT
  TO anon USING (auth.uid() IS NULL AND access_token IS NOT NULL);
