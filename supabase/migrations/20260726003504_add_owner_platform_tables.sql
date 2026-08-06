/*
# Owner platform tables: subscription plans, support tickets, backups, client subscriptions

## Overview
Adds the tables needed to complete the Owner Dashboard (لوحة تحكم المالك):
  - Manage subscription plans and pricing (إدارة الباقات والأسعار)
  - Track client subscriptions and revenue (اشتراكات العملاء والإيرادات)
  - Support tickets from clients (تذاكر الدعم الفني)
  - System backup records (النسخ الاحتياطي والاستعادة)

## New Tables
1. subscription_plans — باقات الاشتراك
2. client_subscriptions — اشتراك كل عميل
3. support_tickets — تذاكر الدعم الفني
4. system_backups — سجلات النسخ الاحتياطي

## Security
- RLS enabled on all new tables, authenticated-only CRUD.
*/

-- 1. subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  max_units integer,
  max_users integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription_plans" ON subscription_plans;
CREATE POLICY "select_own_subscription_plans" ON subscription_plans FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_subscription_plans" ON subscription_plans;
CREATE POLICY "insert_own_subscription_plans" ON subscription_plans FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_subscription_plans" ON subscription_plans;
CREATE POLICY "update_own_subscription_plans" ON subscription_plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_subscription_plans" ON subscription_plans;
CREATE POLICY "delete_own_subscription_plans" ON subscription_plans FOR DELETE TO authenticated USING (true);

-- 2. client_subscriptions
CREATE TABLE IF NOT EXISTS client_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES system_clients(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  amount numeric(10,2) DEFAULT 0,
  last_payment_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_client_subscriptions" ON client_subscriptions;
CREATE POLICY "select_own_client_subscriptions" ON client_subscriptions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_client_subscriptions" ON client_subscriptions;
CREATE POLICY "insert_own_client_subscriptions" ON client_subscriptions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_client_subscriptions" ON client_subscriptions;
CREATE POLICY "update_own_client_subscriptions" ON client_subscriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_client_subscriptions" ON client_subscriptions;
CREATE POLICY "delete_own_client_subscriptions" ON client_subscriptions FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client ON client_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_status ON client_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_expires ON client_subscriptions(expires_at);

-- 3. support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES system_clients(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  category text,
  assigned_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_support_tickets" ON support_tickets;
CREATE POLICY "select_own_support_tickets" ON support_tickets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_support_tickets" ON support_tickets;
CREATE POLICY "insert_own_support_tickets" ON support_tickets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_support_tickets" ON support_tickets;
CREATE POLICY "update_own_support_tickets" ON support_tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_support_tickets" ON support_tickets;
CREATE POLICY "delete_own_support_tickets" ON support_tickets FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client ON support_tickets(client_id);

-- 4. system_backups
CREATE TABLE IF NOT EXISTS system_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  size_bytes bigint,
  storage_url text,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE system_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_system_backups" ON system_backups;
CREATE POLICY "select_own_system_backups" ON system_backups FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_system_backups" ON system_backups;
CREATE POLICY "insert_own_system_backups" ON system_backups FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_system_backups" ON system_backups;
CREATE POLICY "update_own_system_backups" ON system_backups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_system_backups" ON system_backups;
CREATE POLICY "delete_own_system_backups" ON system_backups FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_system_backups_created ON system_backups(created_at DESC);

-- 5. Seed default subscription plans
INSERT INTO subscription_plans (name, name_en, description, price_monthly, price_yearly, max_units, max_users, features, status, sort_order)
VALUES
  ('الباقة الأساسية', 'Basic', 'للمشاريع الصغيرة', 299, 2990, 10, 5, '["إدارة الحجوزات","إدارة الوحدات","الفواتير الأساسية"]'::jsonb, 'active', 1),
  ('الباقة الاحترافية', 'Professional', 'الأكثر شيوعاً', 599, 5990, 50, 20, '["إدارة الحجوزات","إدارة الوحدات","الفواتير","المطعم والمخزون","التقارير المتقدمة","دعم فني مميز"]'::jsonb, 'active', 2),
  ('الباقة الممتازة', 'Premium', 'للمؤسسات الكبيرة', 999, 9990, 200, 100, '["إدارة الحجوزات","إدارة الوحدات","الفواتير","المطعم والمخزون","التقارير المتقدمة","المحاسبة الكاملة","دعم فني 24/7","نسخ احتياطي يومي"]'::jsonb, 'active', 3)
ON CONFLICT DO NOTHING;
