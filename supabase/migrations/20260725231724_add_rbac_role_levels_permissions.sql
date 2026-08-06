/*
# Role-Based Access Control (RBAC) — 7 Hotel Staff Levels

## What this does
Upgrades the existing staff_users table with:
1. A `role_level` (1-7) matching the hotel's hierarchy.
2. Granular permission flags covering every operation the user listed.
3. A `discount_limit_pct` column so discount approval thresholds are enforced per-role.
4. A `get_role_defaults()` function returning the standard permissions for each level,
   so when an admin creates a user at level X, the right permissions are pre-filled.
5. An audit trigger on staff_users that records every change to audit_log.

## Role Levels
1 = Reception / Front Desk (موظف الاستقبال)
2 = Shift Supervisor (مشرف الورديات)
3 = Storekeeper / Purchasing (أمين المخزن)
4 = Accountant / Cashier (المحاسب)
5 = Finance Manager / Controller (المدير المالي)
6 = Operations Manager (مدير التشغيل)
7 = General Manager (المدير العام — full access)

## New Columns on staff_users
- role_level integer (1-7)
- can_check_in_out      — check-in / check-out guests
- can_issue_invoice     — issue guest invoices
- can_cancel_invoice    — cancel/modify confirmed invoices
- can_collect_payment   — record cash/card payments
- can_view_guest_ledger — view guest account statement
- can_manage_waitlist   — manage waitlist & rooms
- can_grant_discount    — grant discounts within limit
- can_transfer_balance  — transfer balances between guests
- can_close_daily       — close daily / shift treasury
- can_view_occupancy     — view occupancy & daily-movement reports
- can_post_journal       — enter journal entries
- can_manage_payables    — manage vendors / payables
- can_reconcile_bank    — reconcile banks & treasury
- can_manage_vat         — manage VAT settings
- can_view_financials   — view financial reports
- can_manage_payroll    — prepare payroll
- can_manage_chart      — edit chart of accounts & cost centers
- can_manage_periods    — open/close fiscal periods
- can_approve_financials — approve final financial statements
- can_manage_fixed_assets
- can_review_audit_log  — review audit log
- can_approve_purchase   — approve purchase requests
- can_manage_users      — create users & assign permissions
- can_manage_settings   — change system settings & prices
- discount_limit_pct     numeric(5,2) — max discount % this user can grant
*/

ALTER TABLE staff_users
  ADD COLUMN IF NOT EXISTS role_level integer DEFAULT 1
    CHECK (role_level >= 1 AND role_level <= 7);

ALTER TABLE staff_users
  ADD COLUMN IF NOT EXISTS can_check_in_out boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_issue_invoice boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_cancel_invoice boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_collect_payment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_guest_ledger boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_waitlist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_grant_discount boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_transfer_balance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_close_daily boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_occupancy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_post_journal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_payables boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_reconcile_bank boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_vat boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_financials boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_payroll boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_chart boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_periods boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_approve_financials boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_fixed_assets boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_review_audit_log boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_approve_purchase boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_users boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_settings boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_limit_pct numeric(5,2) DEFAULT 0;

-- ============================================================
-- Role defaults function
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_role_defaults(p_level integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_defaults jsonb;
BEGIN
  CASE p_level
    -- 1: Reception / Front Desk
    WHEN 1 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', true, 'can_issue_invoice', true, 'can_collect_payment', true,
      'can_view_guest_ledger', true, 'can_manage_waitlist', true,
      'can_cancel_invoice', false, 'can_grant_discount', false, 'can_transfer_balance', false,
      'can_close_daily', false, 'can_view_occupancy', false, 'can_post_journal', false,
      'can_manage_payables', false, 'can_reconcile_bank', false, 'can_manage_vat', false,
      'can_view_financials', false, 'can_manage_payroll', false, 'can_manage_chart', false,
      'can_manage_periods', false, 'can_approve_financials', false, 'can_manage_fixed_assets', false,
      'can_review_audit_log', false, 'can_approve_purchase', false, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 0
    );
    -- 2: Shift Supervisor
    WHEN 2 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', true, 'can_issue_invoice', true, 'can_collect_payment', true,
      'can_view_guest_ledger', true, 'can_manage_waitlist', true,
      'can_cancel_invoice', true, 'can_grant_discount', true, 'can_transfer_balance', true,
      'can_close_daily', true, 'can_view_occupancy', true, 'can_post_journal', false,
      'can_manage_payables', false, 'can_reconcile_bank', false, 'can_manage_vat', false,
      'can_view_financials', false, 'can_manage_payroll', false, 'can_manage_chart', false,
      'can_manage_periods', false, 'can_approve_financials', false, 'can_manage_fixed_assets', false,
      'can_review_audit_log', false, 'can_approve_purchase', false, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 5
    );
    -- 3: Storekeeper / Purchasing
    WHEN 3 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', false, 'can_issue_invoice', false, 'can_collect_payment', false,
      'can_view_guest_ledger', false, 'can_manage_waitlist', false,
      'can_cancel_invoice', false, 'can_grant_discount', false, 'can_transfer_balance', false,
      'can_close_daily', false, 'can_view_occupancy', false, 'can_post_journal', false,
      'can_manage_payables', true, 'can_reconcile_bank', false, 'can_manage_vat', false,
      'can_view_financials', false, 'can_manage_payroll', false, 'can_manage_chart', false,
      'can_manage_periods', false, 'can_approve_financials', false, 'can_manage_fixed_assets', false,
      'can_review_audit_log', false, 'can_approve_purchase', false, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 0
    );
    -- 4: Accountant / Cashier
    WHEN 4 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', false, 'can_issue_invoice', true, 'can_collect_payment', true,
      'can_view_guest_ledger', true, 'can_manage_waitlist', false,
      'can_cancel_invoice', false, 'can_grant_discount', false, 'can_transfer_balance', false,
      'can_close_daily', true, 'can_view_occupancy', true, 'can_post_journal', true,
      'can_manage_payables', true, 'can_reconcile_bank', true, 'can_manage_vat', true,
      'can_view_financials', true, 'can_manage_payroll', true, 'can_manage_chart', false,
      'can_manage_periods', false, 'can_approve_financials', false, 'can_manage_fixed_assets', false,
      'can_review_audit_log', false, 'can_approve_purchase', false, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 0
    );
    -- 5: Finance Manager
    WHEN 5 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', false, 'can_issue_invoice', true, 'can_collect_payment', true,
      'can_view_guest_ledger', true, 'can_manage_waitlist', false,
      'can_cancel_invoice', true, 'can_grant_discount', true, 'can_transfer_balance', true,
      'can_close_daily', true, 'can_view_occupancy', true, 'can_post_journal', true,
      'can_manage_payables', true, 'can_reconcile_bank', true, 'can_manage_vat', true,
      'can_view_financials', true, 'can_manage_payroll', true, 'can_manage_chart', true,
      'can_manage_periods', true, 'can_approve_financials', true, 'can_manage_fixed_assets', true,
      'can_review_audit_log', true, 'can_approve_purchase', true, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 15
    );
    -- 6: Operations Manager
    WHEN 6 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', true, 'can_issue_invoice', true, 'can_collect_payment', false,
      'can_view_guest_ledger', true, 'can_manage_waitlist', true,
      'can_cancel_invoice', false, 'can_grant_discount', true, 'can_transfer_balance', false,
      'can_close_daily', false, 'can_view_occupancy', true, 'can_post_journal', false,
      'can_manage_payables', false, 'can_reconcile_bank', false, 'can_manage_vat', false,
      'can_view_financials', true, 'can_manage_payroll', false, 'can_manage_chart', false,
      'can_manage_periods', false, 'can_approve_financials', false, 'can_manage_fixed_assets', false,
      'can_review_audit_log', false, 'can_approve_purchase', true, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 10
    );
    -- 7: General Manager — full access
    WHEN 7 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', true, 'can_issue_invoice', true, 'can_collect_payment', true,
      'can_view_guest_ledger', true, 'can_manage_waitlist', true,
      'can_cancel_invoice', true, 'can_grant_discount', true, 'can_transfer_balance', true,
      'can_close_daily', true, 'can_view_occupancy', true, 'can_post_journal', true,
      'can_manage_payables', true, 'can_reconcile_bank', true, 'can_manage_vat', true,
      'can_view_financials', true, 'can_manage_payroll', true, 'can_manage_chart', true,
      'can_manage_periods', true, 'can_approve_financials', true, 'can_manage_fixed_assets', true,
      'can_review_audit_log', true, 'can_approve_purchase', true, 'can_manage_users', true,
      'can_manage_settings', true, 'discount_limit_pct', 100
    );
    ELSE v_defaults := jsonb_build_object();
  END CASE;
  RETURN v_defaults;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_role_defaults(integer) TO authenticated;

-- ============================================================
-- Audit trigger on staff_users
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_staff_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (user_id, table_name, record_id, action, old_values, new_values, changed_by)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_staff_users ON staff_users;
CREATE TRIGGER trg_audit_staff_users
  AFTER INSERT OR UPDATE OR DELETE ON staff_users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_staff_users();

-- ============================================================
-- Backfill: set role_level based on existing role text
-- ============================================================
UPDATE staff_users SET role_level = 7 WHERE role = 'admin' AND role_level IS NULL;
UPDATE staff_users SET role_level = 7 WHERE role = 'manager' AND role_level IS NULL;
UPDATE staff_users SET role_level = 6 WHERE role = 'operations' AND role_level IS NULL;
UPDATE staff_users SET role_level = 5 WHERE role = 'finance' AND role_level IS NULL;
UPDATE staff_users SET role_level = 4 WHERE role = 'accountant' AND role_level IS NULL;
UPDATE staff_users SET role_level = 3 WHERE role = 'storekeeper' AND role_level IS NULL;
UPDATE staff_users SET role_level = 2 WHERE role = 'supervisor' AND role_level IS NULL;
UPDATE staff_users SET role_level = 1 WHERE role_level IS NULL;
