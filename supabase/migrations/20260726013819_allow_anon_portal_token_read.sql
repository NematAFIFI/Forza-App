/*
# Allow anon to read portal welcome by access_token

The PortalWelcome page is opened by:
  - The owner (authenticated) who is auto-signed-out before opening it
  - The buyer (may be authenticated or not)

After signing out the owner, the page is loaded as anon.
We need an anon-readable policy for system_clients by access_token
so the welcome page can render the buyer's name/company.
*/

DROP POLICY IF EXISTS "select_portal_token_anon" ON system_clients;
CREATE POLICY "select_portal_token_anon" ON system_clients
  FOR SELECT TO anon
  USING (access_token IS NOT NULL);
