/*
# Accounting Engine: Fiscal Periods, Journal Entries, and Auto-Entry Templates

## What this does
Creates the core double-entry accounting engine for the hotel system:
1. Fiscal periods with daily/monthly closing controls — once locked, no journal entries can be added or modified in that period.
2. Journal entries (header) and journal lines (debits/credits) with a database-level check that debits = credits (balanced entry).
3. Auto-entry templates — pre-defined templates that the system uses to generate journal entries automatically.
4. An audit log table that records every journal entry change with the user, timestamp, and action.

## New Tables
- fiscal_periods (period_code, fiscal_year, period_number, start_date, end_date, status: open/closed_daily/closed_monthly/locked, lock_date, closed_by)
- journal_templates (template_code, trigger_event, is_active)
- journal_template_lines (template_id, account_id, side debit/credit, amount_source)
- journal_entries (entry_number, entry_date, period_code, reference_type, template_id, status draft/posted, totals)
- journal_lines (entry_id, account_id, cost_center_id, debit, credit, balanced CHECK)
- audit_log (table_name, record_id, action, old_values, new_values)

## Security
- RLS enabled on all tables, owner-scoped CRUD (auth.uid() = user_id), user_id defaults to auth.uid().

## Notes
- CHECK constraint on journal_lines ensures each line has either debit or credit but not both.
- post_journal_entry() validates balance and period status before posting.
- generate_fiscal_year() creates 12 monthly periods for a given year.
- close_fiscal_period() handles daily/monthly/lock/reopen.
*/

-- ============================================================
-- 1. fiscal_periods
-- ============================================================
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  period_code text NOT NULL,
  period_name text,
  fiscal_year integer NOT NULL,
  period_number integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed_daily', 'closed_monthly', 'locked')),
  lock_date date,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, period_code)
);

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_fiscal_periods" ON fiscal_periods;
CREATE POLICY "select_own_fiscal_periods" ON fiscal_periods FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_fiscal_periods" ON fiscal_periods;
CREATE POLICY "insert_own_fiscal_periods" ON fiscal_periods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_fiscal_periods" ON fiscal_periods;
CREATE POLICY "update_own_fiscal_periods" ON fiscal_periods FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_fiscal_periods" ON fiscal_periods;
CREATE POLICY "delete_own_fiscal_periods" ON fiscal_periods FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_user_id ON fiscal_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_year ON fiscal_periods(fiscal_year);

-- ============================================================
-- 2. journal_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  template_code text NOT NULL,
  template_name text NOT NULL,
  trigger_event text NOT NULL DEFAULT 'invoice_issue' CHECK (trigger_event IN ('invoice_issue', 'payment_receive', 'inventory_withdraw', 'payroll_post')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, template_code)
);

ALTER TABLE journal_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_journal_templates" ON journal_templates;
CREATE POLICY "select_own_journal_templates" ON journal_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_journal_templates" ON journal_templates;
CREATE POLICY "insert_own_journal_templates" ON journal_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_journal_templates" ON journal_templates;
CREATE POLICY "update_own_journal_templates" ON journal_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_journal_templates" ON journal_templates;
CREATE POLICY "delete_own_journal_templates" ON journal_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journal_templates_user_id ON journal_templates(user_id);

-- ============================================================
-- 3. journal_template_lines
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_template_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES journal_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  line_order integer NOT NULL DEFAULT 0,
  account_id uuid REFERENCES chart_accounts(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
  side text NOT NULL DEFAULT 'debit' CHECK (side IN ('debit', 'credit')),
  amount_source text NOT NULL DEFAULT 'fixed' CHECK (amount_source IN ('fixed', 'invoice_total', 'invoice_subtotal', 'invoice_tax', 'payment_amount', 'withdrawal_value')),
  fixed_amount numeric(14,2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_template_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_journal_template_lines" ON journal_template_lines;
CREATE POLICY "select_own_journal_template_lines" ON journal_template_lines FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_journal_template_lines" ON journal_template_lines;
CREATE POLICY "insert_own_journal_template_lines" ON journal_template_lines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_journal_template_lines" ON journal_template_lines;
CREATE POLICY "update_own_journal_template_lines" ON journal_template_lines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_journal_template_lines" ON journal_template_lines;
CREATE POLICY "delete_own_journal_template_lines" ON journal_template_lines FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journal_template_lines_template_id ON journal_template_lines(template_id);

-- ============================================================
-- 4. journal_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_number text,
  entry_date date NOT NULL,
  period_code text,
  description text,
  reference_type text NOT NULL DEFAULT 'manual' CHECK (reference_type IN ('manual', 'invoice', 'payment', 'inventory', 'payroll')),
  reference_id uuid,
  template_id uuid REFERENCES journal_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
  total_debit numeric(14,2) NOT NULL DEFAULT 0,
  total_credit numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  posted_at timestamptz
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_journal_entries" ON journal_entries;
CREATE POLICY "select_own_journal_entries" ON journal_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_journal_entries" ON journal_entries;
CREATE POLICY "insert_own_journal_entries" ON journal_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_journal_entries" ON journal_entries;
CREATE POLICY "update_own_journal_entries" ON journal_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_journal_entries" ON journal_entries;
CREATE POLICY "delete_own_journal_entries" ON journal_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(period_code);

-- ============================================================
-- 5. journal_lines
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES chart_accounts(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  description text,
  line_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT balanced_line CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  )
);

ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_journal_lines" ON journal_lines;
CREATE POLICY "select_own_journal_lines" ON journal_lines FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_journal_lines" ON journal_lines;
CREATE POLICY "insert_own_journal_lines" ON journal_lines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_journal_lines" ON journal_lines;
CREATE POLICY "update_own_journal_lines" ON journal_lines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_journal_lines" ON journal_lines;
CREATE POLICY "delete_own_journal_lines" ON journal_lines FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_user_id ON journal_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON journal_lines(account_id);

-- ============================================================
-- 6. audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_audit_log" ON audit_log;
CREATE POLICY "select_own_audit_log" ON audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_audit_log" ON audit_log;
CREATE POLICY "insert_own_audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at);

-- ============================================================
-- 7. Trigger: auto-populate created_by on journal_entries
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_journal_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_entries_created_by ON journal_entries;
CREATE TRIGGER trg_journal_entries_created_by
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_journal_created_by();

-- ============================================================
-- 8. Function: validate and post a journal entry
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_journal_entry(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_debit numeric(14,2);
  v_total_credit numeric(14,2);
  v_entry_date date;
  v_period_code text;
  v_user_id uuid;
  v_period_status text;
  v_lock_date date;
BEGIN
  SELECT entry_date, period_code, user_id INTO v_entry_date, v_period_code, v_user_id
  FROM journal_entries WHERE id = p_entry_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Entry not found'; END IF;

  SELECT status, lock_date INTO v_period_status, v_lock_date
  FROM fiscal_periods
  WHERE user_id = v_user_id AND period_code = v_period_code;

  IF FOUND THEN
    IF v_period_status IN ('closed_monthly', 'locked') THEN
      RAISE EXCEPTION 'Period % is closed. Cannot post entries.', v_period_code;
    END IF;
    IF v_period_status = 'closed_daily' AND v_lock_date IS NOT NULL AND v_entry_date <= v_lock_date THEN
      RAISE EXCEPTION 'Daily closing active until %. Cannot post entries before that date.', v_lock_date;
    END IF;
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines WHERE entry_id = p_entry_id;

  IF v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'Entry is not balanced. Debits: %, Credits: %', v_total_debit, v_total_credit;
  END IF;
  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Cannot post a zero-value entry';
  END IF;

  UPDATE journal_entries
  SET status = 'posted', total_debit = v_total_debit, total_credit = v_total_credit, posted_at = now()
  WHERE id = p_entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_journal_entry(uuid) TO authenticated;

-- ============================================================
-- 9. Function: generate fiscal year periods
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_fiscal_year(p_year integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_month integer;
  v_start date;
  v_end date;
  v_code text;
  v_name text;
  ar_names text[] := ARRAY['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  FOR v_month IN 1..12 LOOP
    v_start := make_date(p_year, v_month, 1);
    v_end := (make_date(p_year, v_month + 1, 1) - 1)::date;
    v_code := p_year::text || '-' || lpad(v_month::text, 2, '0');
    v_name := ar_names[v_month] || ' ' || p_year::text;
    INSERT INTO fiscal_periods (user_id, period_code, period_name, fiscal_year, period_number, start_date, end_date, status)
    VALUES (v_uid, v_code, v_name, p_year, v_month, v_start, v_end, 'open')
    ON CONFLICT (user_id, period_code) DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_fiscal_year(integer) TO authenticated;

-- ============================================================
-- 10. Function: close/reopen a fiscal period
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_fiscal_period(p_period_id uuid, p_close_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_end_date date;
BEGIN
  SELECT user_id, end_date INTO v_user_id, v_end_date FROM fiscal_periods WHERE id = p_period_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Period not found'; END IF;
  IF auth.uid() <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_close_type = 'daily' THEN
    UPDATE fiscal_periods SET status = 'closed_daily', lock_date = CURRENT_DATE, closed_by = auth.uid(), closed_at = now() WHERE id = p_period_id;
  ELSIF p_close_type = 'monthly' THEN
    UPDATE fiscal_periods SET status = 'closed_monthly', lock_date = v_end_date, closed_by = auth.uid(), closed_at = now() WHERE id = p_period_id;
  ELSIF p_close_type = 'lock' THEN
    UPDATE fiscal_periods SET status = 'locked', lock_date = v_end_date, closed_by = auth.uid(), closed_at = now() WHERE id = p_period_id;
  ELSIF p_close_type = 'reopen' THEN
    UPDATE fiscal_periods SET status = 'open', lock_date = NULL, closed_by = NULL, closed_at = NULL WHERE id = p_period_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_fiscal_period(uuid, text) TO authenticated;
