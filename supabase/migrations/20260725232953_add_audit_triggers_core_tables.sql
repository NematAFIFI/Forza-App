/*
# Audit Triggers — SLA Section 3 (Audit Log)

Every INSERT / UPDATE / DELETE on the tables listed below is recorded
in `audit_log` with the user, timestamp, old/new values, and action.
The log is append-only — no trigger exists to modify or delete rows
from audit_log, and RLS prevents anyone from deleting rows.

Tables covered:
  - journal_entries
  - journal_lines
  - bookings
  - invoices
  - payments
  - chart_accounts
  - cost_centers
  - services
  - clients
  - properties
  - units
  - inventory_withdrawals
  - staff_users (already has trigger from RBAC migration)
*/

-- Generic audit function (reuse if not exists)
CREATE OR REPLACE FUNCTION public.audit_table_op()
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

-- Attach to each table (drop first to avoid errors on re-run)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'journal_entries','journal_lines','bookings','invoices','payments',
    'chart_accounts','cost_centers','services','clients','properties',
    'units','inventory_withdrawals'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%s ON public.%s;', t, t);
      EXECUTE format('CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.audit_table_op();', t, t);
    END IF;
  END LOOP;
END $$;

-- RLS on audit_log: authenticated users can read; nobody can write via API
-- (writes only happen via triggers with service-role bypass)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_read_authenticated" ON audit_log;
CREATE POLICY "audit_log_read_authenticated" ON audit_log
  FOR SELECT TO authenticated USING (true);

-- No INSERT / UPDATE / DELETE policies => API access blocked, trigger bypass still works.

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id);
