/*
# Enable Realtime Replication on All Tables

Enables Supabase Realtime (postgres_changes) on all application tables
so the frontend can subscribe to INSERT/UPDATE/DELETE events for auto-refresh.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE properties;
ALTER PUBLICATION supabase_realtime ADD TABLE units;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_users;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE bank_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE company_settings;
