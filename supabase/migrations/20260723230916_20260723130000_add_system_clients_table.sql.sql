/*
# Add system_clients table and fix schema

1. New Tables
- `system_clients` — System buyers (مشتري النظام), separate from hotel guests
  - id, name, email, phone, company_name, access_token, status, created_at, user_id

2. Modified Tables
- `staff_users` — add is_owner boolean to identify system owner

3. Security
- RLS enabled on system_clients with authenticated-only access
*/

CREATE TABLE IF NOT EXISTS system_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  access_token text UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE system_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_system_clients" ON system_clients;
CREATE POLICY "select_own_system_clients" ON system_clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_system_clients" ON system_clients;
CREATE POLICY "insert_own_system_clients" ON system_clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_system_clients" ON system_clients;
CREATE POLICY "update_own_system_clients" ON system_clients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_system_clients" ON system_clients;
CREATE POLICY "delete_own_system_clients" ON system_clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add is_owner to staff_users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_users' AND column_name='is_owner') THEN
    ALTER TABLE staff_users ADD COLUMN is_owner boolean DEFAULT false;
  END IF;
END $$;
