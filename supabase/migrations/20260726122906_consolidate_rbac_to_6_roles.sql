-- ============================================================
-- RBAC: Consolidate to 6 hotel roles (remove Operations Manager)
-- ============================================================
-- New role levels:
-- 1 = Reception / Front Desk      (موظف الاستقبال)
-- 2 = Shift Supervisor             (مشرف الوردية)
-- 3 = Storekeeper / Purchasing     (أمين المخزن)
-- 4 = Accountant                   (المحاسب)
-- 5 = Finance Manager              (المدير المالي)
-- 6 = General Manager              (المدير العام)

-- Step 1: Remap existing users before tightening the constraint.
-- Old 7 (GM) -> 6, Old 6 (Operations) -> 5, Old 5 stays 5.
UPDATE staff_users SET role_level = 6 WHERE role_level = 7;
UPDATE staff_users SET role_level = 5 WHERE role_level = 6;

-- Step 2: Replace the CHECK constraint to 1-6
ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_role_level_check;
ALTER TABLE staff_users ADD CONSTRAINT staff_users_role_level_check
  CHECK (role_level >= 1 AND role_level <= 6);

-- Step 3: Rewrite get_role_defaults with the user's exact permission matrix
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
    -- 2: Shift Supervisor (reception + cancel/discount/close/occupancy)
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
    -- 3: Storekeeper / Purchasing (inventory + purchasing only)
    WHEN 3 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', false, 'can_issue_invoice', false, 'can_collect_payment', false,
      'can_view_guest_ledger', false, 'can_manage_waitlist', false,
      'can_cancel_invoice', false, 'can_grant_discount', false, 'can_transfer_balance', false,
      'can_close_daily', false, 'can_view_occupancy', false, 'can_post_journal', false,
      'can_manage_payables', true, 'can_reconcile_bank', false, 'can_manage_vat', false,
      'can_view_financials', false, 'can_manage_payroll', false, 'can_manage_chart', false,
      'can_manage_periods', false, 'can_approve_financials', false, 'can_manage_fixed_assets', false,
      'can_review_audit_log', false, 'can_approve_purchase', true, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 0
    );
    -- 4: Accountant (reception + supervisor + storekeeper + accounting)
    WHEN 4 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', true, 'can_issue_invoice', true, 'can_collect_payment', true,
      'can_view_guest_ledger', true, 'can_manage_waitlist', true,
      'can_cancel_invoice', true, 'can_grant_discount', true, 'can_transfer_balance', true,
      'can_close_daily', true, 'can_view_occupancy', true, 'can_post_journal', true,
      'can_manage_payables', true, 'can_reconcile_bank', true, 'can_manage_vat', true,
      'can_view_financials', true, 'can_manage_payroll', true, 'can_manage_chart', false,
      'can_manage_periods', false, 'can_approve_financials', false, 'can_manage_fixed_assets', false,
      'can_review_audit_log', false, 'can_approve_purchase', true, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 0
    );
    -- 5: Finance Manager (accountant + chart/periods/approve/audit)
    WHEN 5 THEN v_defaults := jsonb_build_object(
      'can_check_in_out', true, 'can_issue_invoice', true, 'can_collect_payment', true,
      'can_view_guest_ledger', true, 'can_manage_waitlist', true,
      'can_cancel_invoice', true, 'can_grant_discount', true, 'can_transfer_balance', true,
      'can_close_daily', true, 'can_view_occupancy', true, 'can_post_journal', true,
      'can_manage_payables', true, 'can_reconcile_bank', true, 'can_manage_vat', true,
      'can_view_financials', true, 'can_manage_payroll', true, 'can_manage_chart', true,
      'can_manage_periods', true, 'can_approve_financials', true, 'can_manage_fixed_assets', true,
      'can_review_audit_log', true, 'can_approve_purchase', true, 'can_manage_users', false,
      'can_manage_settings', false, 'discount_limit_pct', 15
    );
    -- 6: General Manager — full access
    WHEN 6 THEN v_defaults := jsonb_build_object(
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
