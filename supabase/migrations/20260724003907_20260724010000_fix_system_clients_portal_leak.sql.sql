-- Fix: select_portal_by_token on system_clients leaks ALL buyer records to ANY authenticated user
-- because "authenticated" inherits from "anon" and USING(access_token IS NOT NULL) is always true.
-- Same bug class already fixed for bookings, units, invoices, customers, company_settings.
--
-- Fix: restrict to anon-only with auth.uid() IS NULL guard, so only unauthenticated
-- portal requests (via access_token) can read system_clients. Authenticated buyers
-- read their own record via select_buyer_own_client (auth.uid() = buyer_user_id).

DROP POLICY IF EXISTS "select_portal_by_token" ON system_clients;
CREATE POLICY "select_portal_by_token" ON system_clients FOR SELECT
  TO anon USING (auth.uid() IS NULL AND access_token IS NOT NULL);
