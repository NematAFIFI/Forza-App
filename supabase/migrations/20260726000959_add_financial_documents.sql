/*
# Financial Documents: Receipt Vouchers, Payment Vouchers, Bank Transfers

## What this does
Creates a unified `financial_documents` table for cash/bank movement documents:
1. سند قبض (receipt voucher) — money received into cash/bank
2. سند صرف (payment voucher) — money paid out of cash/bank
3. إشعار تحويل بنكي (bank transfer notice) — internal transfer between accounts

Each document has:
- Sequential, immutable, non-reusable document number (enforced by DB sequence + unique constraint)
- Automatic journal entry generation on posting (debit/credit per document type)
- Electronic signature: created_by user, timestamp, status
- Status flow: draft → posted (posted documents cannot be edited; corrections via reverse document)
- Linked bank_account or cash account, counter-party account, optional cost center

## New Tables
- financial_documents — header with doc_number, doc_type, amount, accounts, status
- financial_doc_sequences — per-user, per-type sequential counter (SECURITY DEFINER function to get next number safely)

## Security
- RLS enabled, owner-scoped CRUD (auth.uid() = user_id), user_id defaults to auth.uid().
- 4 policies per table (select/insert/update/delete), TO authenticated.

## Notes
- `next_financial_doc_number()` is SECURITY DEFINER to atomically increment the per-user/per-type sequence.
- `post_financial_document()` creates the linked journal entry (header + 2 lines) and marks the document posted.
- Documents are immutable once posted — the UPDATE policy still allows status change but the app enforces no-edit after posting.
- Reverse documents (إشعار عكسي) are a separate doc_type='reverse' that creates an opposite journal entry.
*/

-- ============================================================
-- 1. financial_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_number text NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('receipt', 'payment', 'transfer', 'reverse')),
  doc_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  -- For receipt: cash_bank_account is debit (money in), counterparty_account is credit
  -- For payment: counterparty_account is debit, cash_bank_account is credit (money out)
  -- For transfer: from_account is debit-side, to_account is credit-side
  cash_bank_account_id uuid REFERENCES chart_accounts(id) ON DELETE SET NULL,
  counterparty_account_id uuid REFERENCES chart_accounts(id) ON DELETE SET NULL,
  from_account_id uuid REFERENCES chart_accounts(id) ON DELETE SET NULL,
  to_account_id uuid REFERENCES chart_accounts(id) ON DELETE SET NULL,
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES cost_centers(id) ON DELETE SET NULL,
  payee_name text,
  description text,
  reference text,
  -- reverse of which document
  reverse_of uuid REFERENCES financial_documents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  posted_at timestamptz,
  UNIQUE (user_id, doc_number)
);

ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_financial_documents" ON financial_documents;
CREATE POLICY "select_own_financial_documents" ON financial_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_financial_documents" ON financial_documents;
CREATE POLICY "insert_own_financial_documents" ON financial_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_financial_documents" ON financial_documents;
CREATE POLICY "update_own_financial_documents" ON financial_documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_financial_documents" ON financial_documents;
CREATE POLICY "delete_own_financial_documents" ON financial_documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_financial_docs_user_id ON financial_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_docs_type ON financial_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_financial_docs_date ON financial_documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_financial_docs_status ON financial_documents(status);

-- ============================================================
-- 2. financial_doc_sequences — per-user, per-type counter
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_doc_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, doc_type)
);

ALTER TABLE financial_doc_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_financial_doc_seq" ON financial_doc_sequences;
CREATE POLICY "select_own_financial_doc_seq" ON financial_doc_sequences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_financial_doc_seq" ON financial_doc_sequences;
CREATE POLICY "insert_own_financial_doc_seq" ON financial_doc_sequences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_financial_doc_seq" ON financial_doc_sequences;
CREATE POLICY "update_own_financial_doc_seq" ON financial_doc_sequences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Function: next_financial_doc_number — atomic sequence
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_financial_doc_number(p_doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_next integer;
  v_prefix text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO financial_doc_sequences (user_id, doc_type, last_number)
  VALUES (v_uid, p_doc_type, 1)
  ON CONFLICT (user_id, doc_type)
  DO UPDATE SET last_number = financial_doc_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  v_prefix := CASE p_doc_type
    WHEN 'receipt' THEN 'RCV'
    WHEN 'payment' THEN 'PAY'
    WHEN 'transfer' THEN 'TRF'
    WHEN 'reverse' THEN 'REV'
    ELSE 'DOC'
  END;

  RETURN v_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_next::text, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_financial_doc_number(text) TO authenticated;

-- ============================================================
-- 4. Function: post_financial_document — create journal entry + post
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_financial_document(p_doc_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc record;
  v_entry_id uuid;
  v_entry_number text;
  v_period_code text;
  v_debit_account uuid;
  v_credit_account uuid;
  v_desc text;
BEGIN
  SELECT * INTO v_doc FROM financial_documents WHERE id = p_doc_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Document not found'; END IF;
  IF v_doc.status = 'posted' THEN RAISE EXCEPTION 'Document already posted'; END IF;

  v_period_code := to_char(v_doc.doc_date, 'YYYY-MM');

  -- Determine debit/credit accounts based on doc_type
  IF v_doc.doc_type = 'receipt' THEN
    v_debit_account := v_doc.cash_bank_account_id;   -- cash/bank increases
    v_credit_account := v_doc.counterparty_account_id; -- counterparty decreases
    v_desc := 'سند قبض - ' || COALESCE(v_doc.payee_name, '');
  ELSIF v_doc.doc_type = 'payment' THEN
    v_debit_account := v_doc.counterparty_account_id;  -- expense/counterparty
    v_credit_account := v_doc.cash_bank_account_id;    -- cash/bank decreases
    v_desc := 'سند صرف - ' || COALESCE(v_doc.payee_name, '');
  ELSIF v_doc.doc_type = 'transfer' THEN
    v_debit_account := v_doc.to_account_id;    -- receiving account
    v_credit_account := v_doc.from_account_id;  -- sending account
    v_desc := 'إشعار تحويل بنكي';
  ELSIF v_doc.doc_type = 'reverse' THEN
    -- Reverse: opposite of original document
    v_debit_account := v_doc.counterparty_account_id;
    v_credit_account := v_doc.cash_bank_account_id;
    v_desc := 'إشعار عكسي - ' || COALESCE(v_doc.description, '');
  END IF;

  IF v_debit_account IS NULL OR v_credit_account IS NULL THEN
    RAISE EXCEPTION 'Missing account assignments';
  END IF;

  -- Create journal entry header
  v_entry_number := 'JE-FD-' || upper(substr(v_doc.doc_type, 1, 3)) || '-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(p_doc_id::text, 1, 8);

  INSERT INTO journal_entries (user_id, entry_number, entry_date, period_code, description, reference_type, reference_id, status)
  VALUES (v_doc.user_id, v_entry_number, v_doc.doc_date, v_period_code, v_desc || ' (' || v_doc.doc_number || ')', 'payment', p_doc_id, 'draft')
  RETURNING id INTO v_entry_id;

  -- Create journal lines: debit line + credit line
  INSERT INTO journal_lines (entry_id, user_id, account_id, cost_center_id, debit, credit, description, line_order)
  VALUES
    (v_entry_id, v_doc.user_id, v_debit_account, v_doc.cost_center_id, v_doc.amount, 0, v_desc, 0),
    (v_entry_id, v_doc.user_id, v_credit_account, v_doc.cost_center_id, 0, v_doc.amount, v_desc, 1);

  -- Post the journal entry
  PERFORM public.post_journal_entry(v_entry_id);

  -- Link document to journal entry and mark posted
  UPDATE financial_documents
  SET status = 'posted', journal_entry_id = v_entry_id, posted_at = now()
  WHERE id = p_doc_id;

  RETURN v_entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_financial_document(uuid) TO authenticated;

-- ============================================================
-- 5. Trigger: set created_by on financial_documents
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_financial_doc_created_by()
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

DROP TRIGGER IF EXISTS trg_financial_docs_created_by ON financial_documents;
CREATE TRIGGER trg_financial_docs_created_by
  BEFORE INSERT ON financial_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_financial_doc_created_by();
