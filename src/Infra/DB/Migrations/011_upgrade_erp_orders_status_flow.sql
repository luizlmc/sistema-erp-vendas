ALTER TABLE erp_orders
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP NULL;

ALTER TABLE erp_orders
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMP NULL;

ALTER TABLE erp_orders
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(60) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_orders_invoice_number
  ON erp_orders (invoice_number)
  WHERE invoice_number IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_erp_orders_status'
  ) THEN
    ALTER TABLE erp_orders DROP CONSTRAINT ck_erp_orders_status;
  END IF;
END
$$;

ALTER TABLE erp_orders
  ADD CONSTRAINT ck_erp_orders_status
  CHECK (status IN ('OPEN', 'CONFIRMED', 'INVOICED', 'CANCELED'));
