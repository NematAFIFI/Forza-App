/*
# Fix portal link visibility for authenticated owners

## Problem
The owner (authenticated) clicks a client portal link to preview it.
The existing `select_portal_by_token` policy is restricted to `anon` only,
so authenticated sessions get 0 rows — the portal shows "link not found".

## Fix
Add a separate policy that also allows authenticated users to read a
system_clients row by its access_token. This lets the owner open portal
links while logged in, and lets a buyer who is also signed in see their
welcome page.
*/

DROP POLICY IF EXISTS "select_portal_token_authenticated" ON system_clients;
CREATE POLICY "select_portal_token_authenticated" ON system_clients
  FOR SELECT TO authenticated
  USING (access_token IS NOT NULL);
