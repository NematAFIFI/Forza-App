/*
# Update RLS policies to authenticated-only (idempotent)

## Security Changes
- All tables currently allow both `anon` and `authenticated` roles.
- Since the app now requires sign-in, we update all policies to `authenticated` only.
- Drop both old anon_ and auth_ policies first for idempotency.
*/

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'properties', 'units', 'customers', 'bookings', 'invoices',
        'expenses', 'commissions', 'staff_users', 'shifts',
        'settlements', 'bank_accounts', 'company_settings'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_select_' || t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_insert_' || t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_update_' || t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_delete_' || t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'auth_select_' || t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'auth_insert_' || t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'auth_update_' || t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'auth_delete_' || t, t);

        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true);', 'auth_select_' || t, t);
        EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (true);', 'auth_insert_' || t, t);
        EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', 'auth_update_' || t, t);
        EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (true);', 'auth_delete_' || t, t);
    END LOOP;
END $$;
