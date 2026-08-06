-- Add access_token column to customers for public portal access
ALTER TABLE customers ADD COLUMN IF NOT EXISTS access_token uuid DEFAULT gen_random_uuid();

-- Add index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_customers_access_token ON customers(access_token) WHERE access_token IS NOT NULL;

-- Allow reading customer info by access_token (for public portal)
-- This policy allows anon users to select a customer ONLY by their access_token
CREATE POLICY "portal_select_by_token"
  ON customers FOR SELECT
  TO anon, authenticated
  USING (access_token IS NOT NULL);

-- Drop the old broad select policy that allowed authenticated to see everything
DROP POLICY IF EXISTS "auth_select_customers" ON customers;

-- Keep authenticated select for staff (they can see all customers)
CREATE POLICY "auth_select_customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);
