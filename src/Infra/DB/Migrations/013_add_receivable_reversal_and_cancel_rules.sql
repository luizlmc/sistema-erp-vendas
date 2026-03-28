ALTER TABLE erp_receivable_payments
  ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE erp_receivable_payments
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP NULL;

ALTER TABLE erp_receivable_payments
  ADD COLUMN IF NOT EXISTS reversed_reason VARCHAR(500) NULL;
