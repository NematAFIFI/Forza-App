/*
# Buyer Account Statement

The existing AccountStatement page shows the accounting ledger (chart of
accounts + journal entries) for hotel operations. SaaS buyers need a
separate billing statement: subscription charges, payments, and running
balance.

## New table: subscription_transactions
Records charges (subscription fees, add-ons, taxes) and payments for each
system_clients row. Positive amount = charge (buyer owes), negative = payment
(credit). Running balance = SUM(amount).
*/

CREATE TABLE IF NOT EXISTS subscription_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES system_clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- the SaaS owner who created the transaction
  type text NOT NULL CHECK (type IN ('charge', 'payment', 'adjustment')),
  category text NOT NULL DEFAULT 'subscription', -- subscription, add_on, tax, refund, etc.
  description text,
  amount numeric(14,2) NOT NULL, -- positive = charge, negative = payment/credit
  reference_number text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_transactions_client ON subscription_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_sub_transactions_date ON subscription_transactions(transaction_date);

-- Enable RLS
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Policies: owner (user_id = system_clients.user_id) and buyer (buyer_user_id = auth.uid()) can see
CREATE POLICY "select_own_subscription_transactions" ON subscription_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = subscription_transactions.client_id
      AND (sc.user_id = auth.uid() OR sc.buyer_user_id = auth.uid())
    )
  );

CREATE POLICY "insert_own_subscription_transactions" ON subscription_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = subscription_transactions.client_id
      AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_subscription_transactions" ON subscription_transactions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = subscription_transactions.client_id
      AND sc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = subscription_transactions.client_id
      AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY "delete_own_subscription_transactions" ON subscription_transactions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_clients sc
      WHERE sc.id = subscription_transactions.client_id
      AND sc.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER TABLE subscription_transactions REPLICA IDENTITY FULL;
