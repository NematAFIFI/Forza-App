-- Add buyer_user_id to system_clients (the buyer's auth UID, set when they create their account)
ALTER TABLE system_clients ADD COLUMN IF NOT EXISTS buyer_user_id uuid;

-- Allow anon/unauthenticated access via access_token (for portal welcome/setup flow)
DROP POLICY IF EXISTS "select_portal_by_token" ON system_clients;
CREATE POLICY "select_portal_by_token" ON system_clients FOR SELECT
  TO anon, authenticated USING (access_token IS NOT NULL);

-- Allow buyer to select their own record by buyer_user_id
DROP POLICY IF EXISTS "select_buyer_own_client" ON system_clients;
CREATE POLICY "select_buyer_own_client" ON system_clients FOR SELECT
  TO authenticated USING (auth.uid() = buyer_user_id);

-- Allow buyer to update their own record (e.g., set password)
DROP POLICY IF EXISTS "update_buyer_own_client" ON system_clients;
CREATE POLICY "update_buyer_own_client" ON system_clients FOR UPDATE
  TO authenticated USING (auth.uid() = buyer_user_id) WITH CHECK (auth.uid() = buyer_user_id);
