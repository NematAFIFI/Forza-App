/*
# Add settlements (مخالصة) table

## Overview
This migration adds a settlements table to track financial settlements for bookings —
the "مخالصة" (final settlement) when a guest checks out, including extras, deposits,
and final payment. This is a key hospitality feature.

## New Table
- **settlements** — المخالصة
  - id, booking_id (FK → bookings), settlement_date, room_charges, extra_charges,
    total_charges, deposit_amount, amount_paid, balance_due, payment_method,
    settlement_notes, created_at

## Security
- RLS enabled.
- 4 policies (select/insert/update/delete) for `TO anon, authenticated` (single-tenant).
*/

CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  settlement_date date NOT NULL DEFAULT CURRENT_DATE,
  room_charges numeric(12,2) DEFAULT 0,
  extra_charges numeric(12,2) DEFAULT 0,
  total_charges numeric(12,2) DEFAULT 0,
  deposit_amount numeric(12,2) DEFAULT 0,
  amount_paid numeric(12,2) DEFAULT 0,
  balance_due numeric(12,2) DEFAULT 0,
  payment_method text,
  settlement_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settlements" ON settlements;
CREATE POLICY "anon_select_settlements" ON settlements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settlements" ON settlements;
CREATE POLICY "anon_insert_settlements" ON settlements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settlements" ON settlements;
CREATE POLICY "anon_update_settlements" ON settlements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settlements" ON settlements;
CREATE POLICY "anon_delete_settlements" ON settlements FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_settlements_booking_id ON settlements(booking_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON settlements(settlement_date);
