ALTER TABLE erp_accounts_receivable
  DROP CONSTRAINT IF EXISTS uq_erp_accounts_receivable_order;

ALTER TABLE erp_accounts_receivable
  ADD COLUMN IF NOT EXISTS installment_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installments_total INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(40) NOT NULL DEFAULT 'UNSPECIFIED',
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'ORDER_INVOICE';

CREATE INDEX IF NOT EXISTS idx_erp_accounts_receivable_order
  ON erp_accounts_receivable (order_id);

UPDATE erp_accounts_receivable
SET installment_no = COALESCE(installment_no, 1),
    installments_total = COALESCE(installments_total, 1),
    payment_method = COALESCE(NULLIF(payment_method, ''), 'UNSPECIFIED'),
    source = COALESCE(NULLIF(source, ''), 'ORDER_INVOICE');

