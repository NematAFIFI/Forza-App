/*
# Create company_settings table

## Overview
Single-row table storing the hotel/company information used across the system:
invoices, reports, and the sidebar header. Designed as a key-value style config
table with one active row (singleton pattern).

## New Table
- **company_settings** — بيانات الشركة
  - id, company_name, legal_name, cr_number (سجل تجاري), vat_number (ضريبة),
    address, phone, email, website, logo_url, currency, tax_rate, invoice_prefix,
    footer_note, created_at, updated_at

## Security
- RLS enabled, all CRUD for anon+authenticated (single-tenant).
*/

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'رواق',
  legal_name text,
  cr_number text,
  vat_number text,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  currency text NOT NULL DEFAULT 'SAR',
  tax_rate numeric(5,2) DEFAULT 15,
  invoice_prefix text DEFAULT 'INV-',
  footer_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_company_settings" ON company_settings;
CREATE POLICY "anon_select_company_settings" ON company_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_company_settings" ON company_settings;
CREATE POLICY "anon_insert_company_settings" ON company_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_company_settings" ON company_settings;
CREATE POLICY "anon_update_company_settings" ON company_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_company_settings" ON company_settings;
CREATE POLICY "anon_delete_company_settings" ON company_settings FOR DELETE
  TO anon, authenticated USING (true);

-- Seed a default row
INSERT INTO company_settings (company_name, legal_name, cr_number, vat_number, address, phone, email, footer_note)
VALUES ('رواق', 'رواق لإدارة الفنادق والشقق المخدومة', '', '', '', '', '', 'شكراً لاختياركم رواق')
ON CONFLICT DO NOTHING;
