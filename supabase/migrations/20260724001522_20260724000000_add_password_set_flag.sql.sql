-- Track whether buyer has set their own password
ALTER TABLE system_clients ADD COLUMN IF NOT EXISTS password_set boolean DEFAULT false;
