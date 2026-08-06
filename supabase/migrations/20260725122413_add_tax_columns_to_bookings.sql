/*
# Add tax columns to bookings table

1. Changes
- Add `tax_rate` (numeric, default 15) to bookings — the VAT percentage applied.
- Add `tax_amount` (numeric, default 0) to bookings — the calculated tax amount.
- Add `subtotal` (numeric, default 0) to bookings — the pre-tax amount.
- The existing `total_amount` now represents the tax-inclusive total.
2. Notes
- `check_in_time` and `check_out_time` columns already exist as text.
- All new columns are nullable with defaults so existing rows are unaffected.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'tax_rate') THEN
    ALTER TABLE bookings ADD COLUMN tax_rate numeric DEFAULT 15;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'tax_amount') THEN
    ALTER TABLE bookings ADD COLUMN tax_amount numeric DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'subtotal') THEN
    ALTER TABLE bookings ADD COLUMN subtotal numeric DEFAULT 0;
  END IF;
END $$;
