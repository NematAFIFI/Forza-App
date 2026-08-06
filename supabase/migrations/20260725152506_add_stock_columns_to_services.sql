/*
# Add inventory stock columns to services table

1. Modified Tables
- `services`: add `stock` (integer, default 0) and `low_stock_threshold` (integer, default 5)
- These columns support the Inventory page's stock tracking and low-stock alerts.
2. Security
- No RLS changes; existing owner-scoped policies on `services` already cover the new columns.
3. Important Notes
- Both columns are nullable-safe with sensible defaults so existing rows get 0 stock / threshold 5.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'stock') THEN
    ALTER TABLE services ADD COLUMN stock integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'low_stock_threshold') THEN
    ALTER TABLE services ADD COLUMN low_stock_threshold integer NOT NULL DEFAULT 5;
  END IF;
END $$;
