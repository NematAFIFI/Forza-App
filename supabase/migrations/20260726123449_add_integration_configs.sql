/*
# Integrations & External Interfaces — Buyer Portal

## Purpose
Gives each hotel (tenant) a structured place to connect third-party platforms:
booking channels (Booking.com, Agoda, Expedia), accounting systems (SMACC, Qoyod),
payment gateways (Mada, Visa, Apple Pay), hotel hardware (door locks, POS printers),
and POS systems. Tracks sync status and a log of integration operations.

## New Tables

### integration_configs
- `id` uuid PK
- `user_id` uuid NOT NULL DEFAULT auth.uid() — tenant owner
- `provider` text NOT NULL — e.g. 'booking', 'agoda', 'expedia', 'smacc', 'qoyod', 'mada', 'visa', 'apple_pay', 'door_locks', 'pos_printer', 'pos_system'
- `category` text NOT NULL — 'channel' | 'accounting' | 'payment' | 'hardware' | 'pos'
- `display_name` text NOT NULL — human label
- `credentials` jsonb DEFAULT '{}' — encrypted-ish store for API keys, hotel IDs, usernames (stored as JSON; in production these would be in Vault)
- `room_mapping` jsonb DEFAULT '{}' — maps external room type codes to internal unit IDs
- `enabled` boolean DEFAULT false
- `status` text DEFAULT 'disconnected' — 'connected' | 'disconnected' | 'error'
- `last_sync_at` timestamptz
- `last_error` text
- `auto_sync` boolean DEFAULT true
- `created_at` / `updated_at` timestamptz

Unique on (user_id, provider) — one config per provider per tenant.

### integration_sync_logs
- `id` uuid PK
- `user_id` uuid NOT NULL DEFAULT auth.uid()
- `config_id` uuid REFERENCES integration_configs(id) ON DELETE CASCADE
- `action` text NOT NULL — 'sync' | 'connect' | 'disconnect' | 'error' | 'manual_sync'
- `status` text NOT NULL — 'success' | 'failed' | 'partial'
- `records_processed` integer DEFAULT 0
- `message` text
- `created_at` timestamptz DEFAULT now()

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD: each authenticated user can only access rows where user_id = auth.uid().
- 4 policies per table (select/insert/update/delete), TO authenticated.
*/

CREATE TABLE IF NOT EXISTS integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  category text NOT NULL CHECK (category IN ('channel','accounting','payment','hardware','pos')),
  display_name text NOT NULL,
  credentials jsonb DEFAULT '{}'::jsonb,
  room_mapping jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT false,
  status text DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error')),
  last_sync_at timestamptz,
  last_error text,
  auto_sync boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_integrations" ON integration_configs;
CREATE POLICY "select_own_integrations" ON integration_configs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_integrations" ON integration_configs;
CREATE POLICY "insert_own_integrations" ON integration_configs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_integrations" ON integration_configs;
CREATE POLICY "update_own_integrations" ON integration_configs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_integrations" ON integration_configs;
CREATE POLICY "delete_own_integrations" ON integration_configs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id uuid REFERENCES integration_configs(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','failed','partial')),
  records_processed integer DEFAULT 0,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sync_logs" ON integration_sync_logs;
CREATE POLICY "select_own_sync_logs" ON integration_sync_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sync_logs" ON integration_sync_logs;
CREATE POLICY "insert_own_sync_logs" ON integration_sync_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sync_logs" ON integration_sync_logs;
CREATE POLICY "update_own_sync_logs" ON integration_sync_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sync_logs" ON integration_sync_logs;
CREATE POLICY "delete_own_sync_logs" ON integration_sync_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_integration_configs_user ON integration_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_user ON integration_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_config ON integration_sync_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_created ON integration_sync_logs(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_integration_configs_updated ON integration_configs;
CREATE TRIGGER trg_integration_configs_updated
  BEFORE UPDATE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
