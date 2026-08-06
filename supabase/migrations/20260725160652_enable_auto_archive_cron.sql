/*
# Enable pg_cron for scheduled auto-archiving

1. Extensions
- Install `pg_cron` in the `cron` schema (Supabase-managed convention).
2. New Functions
- `auto_archive_old_records()` — marks records older than 1 month as archived
  across all system tables that support archiving (bookings, invoices, customers,
  units, properties, services, staff_users). Only touches rows that are not
  already archived.
3. Scheduled Jobs
- A pg_cron job runs `auto_archive_old_records()` at 00:05 on the 1st of every
  month (server time), so the system archives itself automatically at month-end.
4. Security
- The function is SECURITY DEFINER so the cron job (which runs as the `cron`
  role) can update tables without needing per-table RLS grants.
- No RLS policy changes.
5. Notes
- pg_cron is a Supabase-managed extension; on some plans it must be enabled via
  the dashboard. The migration is idempotent — re-running it is safe.
*/

-- 1. Install pg_cron (Supabase requires it in the `cron` schema)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- 2. Auto-archive function
CREATE OR REPLACE FUNCTION public.auto_archive_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff timestamptz := date_trunc('month', now()) - interval '1 month';
BEGIN
  -- bookings (archived + archived_at already exist)
  UPDATE bookings
    SET archived = true, archived_at = now()
    WHERE archived = false
      AND created_at < cutoff;

  -- invoices
  UPDATE invoices
    SET archived = true, archived_at = now()
    WHERE archived = false
      AND created_at < cutoff;

  -- customers
  UPDATE customers
    SET archived = true, archived_at = now()
    WHERE archived = false
      AND created_at < cutoff;

  -- units
  UPDATE units
    SET archived = true, archived_at = now()
    WHERE archived = false
      AND created_at < cutoff;

  -- properties
  UPDATE properties
    SET archived = true, archived_at = now()
    WHERE archived = false
      AND created_at < cutoff;

  -- services
  UPDATE services
    SET archived = true, archived_at = now()
    WHERE archived = false
      AND created_at < cutoff;

  -- staff_users
  UPDATE staff_users
    SET archived = true, archived_at = now()
    WHERE archived = false
      AND created_at < cutoff;
END;
$$;

-- 3. Schedule the job to run at 00:05 on the 1st of every month
SELECT cron.schedule(
  'auto-archive-monthly',
  '5 0 1 * *',
  $$SELECT public.auto_archive_old_records();$$
);
