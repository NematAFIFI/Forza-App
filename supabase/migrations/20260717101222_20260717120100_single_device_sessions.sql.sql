/*
# Single-Device Session Tracking

## What this does
Creates a `user_sessions` table that tracks the active session for each user.
When a user logs in on a new device, the previous session is invalidated,
forcing logout on the old device.

## New Table
- `user_sessions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, unique — one active session per user)
  - `session_token` (text, the JWT access token hash to identify the current session)
  - `device_info` (text, optional user-agent/device description)
  - `created_at` (timestamp, when this session started)

## Security
- RLS enabled with per-user ownership.
- Each user can only see their own session record.
- The edge function uses the service role key to manage sessions (bypasses RLS).
*/

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  device_info text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_session" ON user_sessions;
CREATE POLICY "select_own_session" ON user_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_session" ON user_sessions;
CREATE POLICY "delete_own_session" ON user_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
