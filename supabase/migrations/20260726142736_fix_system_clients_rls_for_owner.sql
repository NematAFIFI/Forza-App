/*
# Fix system_clients RLS policies for owner access

## Problem
The `system_clients` table had RLS policies requiring `auth.uid() = user_id` for INSERT and DELETE,
but the owner creating a buyer never sets `user_id` to their own UID. This means:
1. INSERT silently fails — the buyer auth user is created but no `system_clients` row appears.
2. DELETE fails — the owner can't delete buyers they "don't own" per RLS.

## Fix
1. Drop the restrictive `insert_own_system_clients` and `delete_own_system_clients` policies.
2. Create new INSERT policy allowing any authenticated user to insert (the owner creates buyers).
3. Create new DELETE policy allowing any authenticated user to delete (the owner deletes buyers).
4. Keep SELECT and UPDATE policies that allow both `user_id` (owner) and `buyer_user_id` (buyer) access.
5. Set `user_id` default to `auth.uid()` so inserts that omit it still work.

## Tables modified
- `system_clients`: RLS policies replaced, `user_id` column gets DEFAULT auth.uid().
*/

-- Make user_id default to the authenticated owner
ALTER TABLE system_clients ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop old restrictive policies
DROP POLICY IF EXISTS "insert_own_system_clients" ON system_clients;
DROP POLICY IF EXISTS "delete_own_system_clients" ON system_clients;
DROP POLICY IF EXISTS "select_own_system_clients" ON system_clients;
DROP POLICY IF EXISTS "update_own_system_clients" ON system_clients;

-- INSERT: any authenticated user (owner) can create buyer records
CREATE POLICY "insert_system_clients"
ON system_clients FOR INSERT
TO authenticated WITH CHECK (true);

-- SELECT: owner (user_id) or buyer (buyer_user_id) can read
CREATE POLICY "select_system_clients"
ON system_clients FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = buyer_user_id);

-- UPDATE: owner (user_id) or buyer (buyer_user_id) can update
CREATE POLICY "update_system_clients"
ON system_clients FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = buyer_user_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = buyer_user_id);

-- DELETE: any authenticated user (owner) can delete
CREATE POLICY "delete_system_clients"
ON system_clients FOR DELETE
TO authenticated USING (true);
