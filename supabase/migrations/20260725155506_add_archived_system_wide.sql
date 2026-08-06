/*
# Add archived columns system-wide

Adds `archived` (boolean) and `archived_at` (timestamptz) to all user-facing
tables that represent records the buyer/owner may want to archive across the
system. `bookings` already has these columns from a prior migration, so it is
skipped.
*/

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'customers',
    'invoices',
    'units',
    'properties',
    'services',
    'staff_users'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'archived'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN archived boolean NOT NULL DEFAULT false', tbl);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_archived ON %I(archived)', tbl, tbl);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'archived_at'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN archived_at timestamptz', tbl);
    END IF;
  END LOOP;
END $$;
