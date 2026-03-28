CREATE TABLE IF NOT EXISTS erp_accounts_receivable (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  client_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  original_amount NUMERIC(14, 2) NOT NULL,
  paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(14, 2) NOT NULL,
  due_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP NULL,
  canceled_at TIMESTAMP NULL,
  CONSTRAINT uq_erp_accounts_receivable_order UNIQUE (order_id),
  CONSTRAINT ck_erp_accounts_receivable_status CHECK (status IN ('OPEN', 'PARTIAL', 'PAID', 'CANCELED')),
  CONSTRAINT fk_erp_accounts_receivable_order FOREIGN KEY (order_id) REFERENCES erp_orders(id),
  CONSTRAINT fk_erp_accounts_receivable_client FOREIGN KEY (client_id) REFERENCES erp_clients(id)
);

CREATE INDEX IF NOT EXISTS idx_erp_accounts_receivable_status
  ON erp_accounts_receivable (status);

CREATE INDEX IF NOT EXISTS idx_erp_accounts_receivable_client
  ON erp_accounts_receivable (client_id);

CREATE TABLE IF NOT EXISTS erp_receivable_payments (
  id BIGSERIAL PRIMARY KEY,
  receivable_id BIGINT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_erp_receivable_payments_amount CHECK (amount > 0),
  CONSTRAINT fk_erp_receivable_payments_receivable FOREIGN KEY (receivable_id) REFERENCES erp_accounts_receivable(id)
);

CREATE INDEX IF NOT EXISTS idx_erp_receivable_payments_receivable
  ON erp_receivable_payments (receivable_id);
