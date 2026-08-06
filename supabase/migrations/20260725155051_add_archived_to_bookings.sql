/*
# Add archived columns to bookings

1. New Columns
- `archived` (boolean, default false) — whether the booking is archived
- `archived_at` (timestamptz, nullable) — when it was archived
2. Security
- No RLS policy changes needed; existing policies already cover UPDATE.
*/

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_archived ON bookings(archived);
