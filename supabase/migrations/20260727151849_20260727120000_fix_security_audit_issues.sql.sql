/*
# Fix all Bolt security audit issues (45 findings)

## 1. Function Search Path Mutable
- `auto_archive_old_records()` — add `SET search_path = public` to pin the search path.

## 2. RLS Policy Always True (15 findings across 5 tables)
Replace unrestricted (`true`) policies with ownership-scoped policies:

- `client_subscriptions` (INSERT/UPDATE/DELETE) — scope through system_clients ownership:
  owner (user_id = auth.uid()) OR buyer (buyer_user_id = auth.uid()).
- `subscription_plans` (INSERT/UPDATE/DELETE) — global reference data; CRUD restricted
  to owners (staff_users.is_owner = true). SELECT remains open to authenticated.
- `support_tickets` (INSERT/UPDATE/DELETE) — scope through system_clients ownership.
- `system_backups` (INSERT/UPDATE/DELETE) — owner-only via staff_users.is_owner.
- `system_clients` (INSERT/DELETE) — scope to auth.uid() = user_id (the creating owner).
  SELECT/UPDATE policies already scoped (unchanged).

## 3. Public (anon) Can Execute SECURITY DEFINER Function (15 functions)
Revoke EXECUTE from `anon` on all SECURITY DEFINER functions so unauthenticated
callers cannot invoke them via the REST API.

## 4. Signed-In (authenticated) Can Execute SECURITY DEFINER Function (15 functions)
For trigger-only functions (audit_table_op, audit_staff_users, set_updated_at,
set_journal_created_by, set_financial_doc_created_by): revoke EXECUTE from
`authenticated` as well — they are only invoked via triggers, never via RPC.
For app-RPC functions: keep authenticated (intentional), revoke anon only.
*/

-- ============================================================
-- 1. Fix mutable search_path on auto_archive_old_records
-- ============================================================
-- The function body is unchanged; we only re-declare with a pinned search_path.
-- We must recreate it, so we read the existing definition and reapply.
CREATE OR REPLACE FUNCTION public.auto_archive_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Archive bookings whose checkout passed more than 90 days ago
  UPDATE bookings
  SET archived = true, archived_at = now()
  WHERE archived = false
    AND check_out < now() - interval '90 days';

  -- Archive invoices older than 180 days
  UPDATE invoices
  SET archived = true, archived_at = now()
  WHERE archived = false
    AND created_at < now() - interval '180 days';

  -- Archive customers with no active bookings and older than 365 days
  UPDATE customers
  SET archived = true, archived_at = now()
  WHERE archived = false
    AND created_at < now() - interval '365 days'
    AND NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.customer_id = customers.id
        AND bookings.archived = false
    );
END;
$$;

-- ============================================================
-- 2. Fix RLS policies that are always true
-- ============================================================

-- ---------- client_subscriptions ----------
DROP POLICY IF EXISTS "insert_own_client_subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "update_own_client_subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "delete_own_client_subscriptions" ON client_subscriptions;

CREATE POLICY "insert_own_client_subscriptions" ON client_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = client_subscriptions.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  );

CREATE POLICY "update_own_client_subscriptions" ON client_subscriptions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = client_subscriptions.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = client_subscriptions.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  );

CREATE POLICY "delete_own_client_subscriptions" ON client_subscriptions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = client_subscriptions.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  );

-- ---------- subscription_plans ----------
-- Global reference data: SELECT for all authenticated (unchanged).
-- INSERT/UPDATE/DELETE restricted to owners via staff_users.is_owner.
DROP POLICY IF EXISTS "insert_own_subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "update_own_subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "delete_own_subscription_plans" ON subscription_plans;

CREATE POLICY "insert_own_subscription_plans" ON subscription_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_users
      WHERE staff_users.user_id = auth.uid()
      AND staff_users.is_owner = true
    )
  );

CREATE POLICY "update_own_subscription_plans" ON subscription_plans
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_users
      WHERE staff_users.user_id = auth.uid()
      AND staff_users.is_owner = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_users
      WHERE staff_users.user_id = auth.uid()
      AND staff_users.is_owner = true
    )
  );

CREATE POLICY "delete_own_subscription_plans" ON subscription_plans
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_users
      WHERE staff_users.user_id = auth.uid()
      AND staff_users.is_owner = true
    )
  );

-- ---------- support_tickets ----------
DROP POLICY IF EXISTS "insert_own_support_tickets" ON support_tickets;
DROP POLICY IF EXISTS "update_own_support_tickets" ON support_tickets;
DROP POLICY IF EXISTS "delete_own_support_tickets" ON support_tickets;

CREATE POLICY "insert_own_support_tickets" ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = support_tickets.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  );

CREATE POLICY "update_own_support_tickets" ON support_tickets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = support_tickets.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = support_tickets.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  );

CREATE POLICY "delete_own_support_tickets" ON support_tickets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = support_tickets.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  );

-- ---------- system_backups ----------
-- Owner-only management via staff_users.is_owner.
DROP POLICY IF EXISTS "insert_own_system_backups" ON system_backups;
DROP POLICY IF EXISTS "update_own_system_backups" ON system_backups;
DROP POLICY IF EXISTS "delete_own_system_backups" ON system_backups;

CREATE POLICY "insert_own_system_backups" ON system_backups
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_users
      WHERE staff_users.user_id = auth.uid()
      AND staff_users.is_owner = true
    )
  );

CREATE POLICY "update_own_system_backups" ON system_backups
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_users
      WHERE staff_users.user_id = auth.uid()
      AND staff_users.is_owner = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_users
      WHERE staff_users.user_id = auth.uid()
      AND staff_users.is_owner = true
    )
  );

CREATE POLICY "delete_own_system_backups" ON system_backups
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_users
      WHERE staff_users.user_id = auth.uid()
      AND staff_users.is_owner = true
    )
  );

-- ---------- system_clients ----------
-- INSERT and DELETE were `true`; scope to the creating owner (user_id = auth.uid()).
-- SELECT and UPDATE policies already exist and are correctly scoped (unchanged).
DROP POLICY IF EXISTS "insert_system_clients" ON system_clients;
DROP POLICY IF EXISTS "delete_system_clients" ON system_clients;

CREATE POLICY "insert_system_clients" ON system_clients
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_system_clients" ON system_clients
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 3 & 4. Revoke EXECUTE on SECURITY DEFINER functions
-- ============================================================

-- Trigger-only functions: revoke from both anon AND authenticated.
-- Triggers invoke these with the function owner's privileges, so
-- revoking direct EXECUTE does not affect trigger operation.
REVOKE EXECUTE ON FUNCTION public.audit_table_op() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_staff_users() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_journal_created_by() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_financial_doc_created_by() FROM anon, authenticated;

-- App RPC functions: revoke from anon only (authenticated access is intentional).
REVOKE EXECUTE ON FUNCTION public.assign_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_archive_old_records() FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_fiscal_period(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_buyer_linked() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_fiscal_year(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_role_defaults(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_financial_doc_number(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.post_financial_document(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.post_journal_entry(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_chart_template() FROM anon;
