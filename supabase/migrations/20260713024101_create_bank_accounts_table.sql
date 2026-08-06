/*
# Create bank_accounts table

## Overview
This migration adds a bank_accounts table to manage the hotel's bank accounts.
Payment methods across the system (invoices, settlements, expenses, commissions)
will be linked to these bank accounts, allowing proper financial tracking.

## New Table
- **bank_accounts** — الحسابات البنكية
  - id, bank_name, account_name, account_number, iban, account_type (current/savings),
    currency, balance, status (active/inactive), notes, created_at

## Security
- RLS enabled.
- 4 policies (select/insert/update/delete) for `TO anon, authenticated` (single-tenant).
*/

CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text,
  iban text,
  account_type text NOT NULL DEFAULT 'current' CHECK (account_type IN ('current', 'savings', 'investment')),
  currency text NOT NULL DEFAULT 'SAR',
  balance numeric(14,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bank_accounts" ON bank_accounts;
CREATE POLICY "anon_select_bank_accounts" ON bank_accounts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bank_accounts" ON bank_accounts;
CREATE POLICY "anon_insert_bank_accounts" ON bank_accounts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bank_accounts" ON bank_accounts;
CREATE POLICY "anon_update_bank_accounts" ON bank_accounts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bank_accounts" ON bank_accounts;
CREATE POLICY "anon_delete_bank_accounts" ON bank_accounts FOR DELETE
  TO anon, authenticated USING (true);
