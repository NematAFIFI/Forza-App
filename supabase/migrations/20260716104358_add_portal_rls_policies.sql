-- Allow anon to read bookings and invoices for customer portal
-- The edge function validates the access_token first, then queries by customer_id
-- These policies allow anon to select bookings/invoices (the edge function filters by customer_id)

DROP POLICY IF EXISTS "portal_select_bookings" ON bookings;
CREATE POLICY "portal_select_bookings"
  ON bookings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "portal_select_invoices" ON invoices;
CREATE POLICY "portal_select_invoices"
  ON invoices FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anon to read company settings (public info for invoice header)
DROP POLICY IF EXISTS "portal_select_settings" ON company_settings;
CREATE POLICY "portal_select_settings"
  ON company_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anon to read units (for booking display in portal)
DROP POLICY IF EXISTS "portal_select_units" ON units;
CREATE POLICY "portal_select_units"
  ON units FOR SELECT
  TO anon, authenticated
  USING (true);
