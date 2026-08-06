/*
# Fix SECURITY DEFINER execute grants on replace_default_chart_template

## Root cause
`replace_default_chart_template()` was created AFTER the 20260727130000
revoke migration, so it still has the default `PUBLIC` EXECUTE grant.
`anon` (inherits PUBLIC) and `authenticated` can both execute it via REST,
which lets anyone wipe and re-seed a tenant's chart of accounts.

## Fix
1. Revoke EXECUTE from PUBLIC (closes anon access).
2. Grant EXECUTE to authenticated only — same pattern as the other
   app-RPC functions in the 20260727130000 migration.
*/

REVOKE EXECUTE ON FUNCTION public.replace_default_chart_template() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.replace_default_chart_template() FROM anon;
REVOKE EXECUTE ON FUNCTION public.replace_default_chart_template() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_default_chart_template() TO authenticated;
