/*
# Fix SECURITY DEFINER function execute grants (30 findings)

## Root cause
All 15 SECURITY DEFINER functions had a default `PUBLIC` grant.
The `anon` role inherits from `PUBLIC`, so the previous `REVOKE FROM anon`
had no effect — `anon` could still execute every function via REST.

## Fix
1. Revoke EXECUTE from `PUBLIC` on all 15 SECURITY DEFINER functions.
   This closes anon access for all of them.
2. For trigger-only functions (audit_table_op, audit_staff_users,
   set_updated_at, set_journal_created_by, set_financial_doc_created_by):
   revoke from `authenticated` too — they run only via triggers, never via RPC.
3. For app-RPC functions (ensure_buyer_linked, auto_archive_old_records,
   next_financial_doc_number, post_financial_document, post_journal_entry,
   generate_fiscal_year, close_fiscal_period, seed_default_chart_template,
   get_role_defaults, assign_user_role): grant EXECUTE to `authenticated` only.
*/

-- Revoke PUBLIC execute on all 15 SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.assign_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_staff_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_table_op() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_archive_old_records() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_fiscal_period(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_buyer_linked() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_fiscal_year(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_role_defaults(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_financial_doc_number(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_financial_document(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_journal_entry(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_chart_template() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_financial_doc_created_by() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_journal_created_by() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- Trigger-only functions: also revoke from authenticated (they run via triggers, not RPC)
REVOKE EXECUTE ON FUNCTION public.audit_table_op() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_staff_users() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_journal_created_by() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_financial_doc_created_by() FROM authenticated;

-- App-RPC functions: grant execute to authenticated only
GRANT EXECUTE ON FUNCTION public.assign_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_archive_old_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_fiscal_period(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_buyer_linked() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_fiscal_year(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_defaults(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_financial_doc_number(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_financial_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_journal_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_chart_template() TO authenticated;
