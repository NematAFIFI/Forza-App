-- Fix: audit trigger inserted TG_OP (uppercase INSERT/UPDATE/DELETE) into
-- audit_log.action, but the column CHECK only allows lowercase values.
-- This caused every INSERT on cost_centers / chart_accounts (and other
-- audited tables) to fail, so "Load Default Template" in the buyer portal
-- could not seed any rows.

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
    lower(TG_OP),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Same fix for the staff_users audit trigger
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
    lower(TG_OP),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
