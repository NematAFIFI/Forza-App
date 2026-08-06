/*
# Create inventory_withdrawals table

1. New Tables
- `inventory_withdrawals`
  - `id` (uuid, primary key)
  - `service_id` (uuid, foreign key to services.id, on delete cascade) — the inventory item being withdrawn
  - `quantity` (integer, not null, check > 0) — how many units were withdrawn
  - `reason` (text, nullable) — optional note explaining the withdrawal
  - `user_id` (uuid, not null, defaults to auth.uid()) — the staff member who made the request
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `inventory_withdrawals`.
- Owner-scoped CRUD: each authenticated user can only access their own withdrawal records.
3. Important Notes
- Each withdrawal row is a log entry; the actual stock decrement happens in the frontend by updating `services.stock`.
- The table serves as an audit trail so management can review who withdrew what and when.
*/

CREATE TABLE IF NOT EXISTS inventory_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_withdrawals" ON inventory_withdrawals;
CREATE POLICY "select_own_withdrawals" ON inventory_withdrawals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_withdrawals" ON inventory_withdrawals;
CREATE POLICY "insert_own_withdrawals" ON inventory_withdrawals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_withdrawals" ON inventory_withdrawals;
CREATE POLICY "update_own_withdrawals" ON inventory_withdrawals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_withdrawals" ON inventory_withdrawals;
CREATE POLICY "delete_own_withdrawals" ON inventory_withdrawals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_withdrawals_service_id ON inventory_withdrawals(service_id);
CREATE INDEX IF NOT EXISTS idx_inventory_withdrawals_created_at ON inventory_withdrawals(created_at DESC);
