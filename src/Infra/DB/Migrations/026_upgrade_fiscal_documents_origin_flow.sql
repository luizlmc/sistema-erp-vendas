DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_erp_fiscal_documents_order'
  ) THEN
    ALTER TABLE erp_fiscal_documents
      DROP CONSTRAINT uq_erp_fiscal_documents_order;
  END IF;
END
$$;

ALTER TABLE erp_fiscal_documents
  ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE erp_fiscal_documents
  ADD COLUMN IF NOT EXISTS origin_type VARCHAR(20) NULL;

ALTER TABLE erp_fiscal_documents
  ADD COLUMN IF NOT EXISTS origin_id BIGINT NULL;

ALTER TABLE erp_fiscal_documents
  ADD COLUMN IF NOT EXISTS client_id BIGINT NULL;

ALTER TABLE erp_fiscal_documents
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(150) NULL;

ALTER TABLE erp_fiscal_documents
  ADD COLUMN IF NOT EXISTS recipient_document VARCHAR(30) NULL;

ALTER TABLE erp_fiscal_documents
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 2) NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_erp_fiscal_documents_type'
  ) THEN
    ALTER TABLE erp_fiscal_documents
      DROP CONSTRAINT ck_erp_fiscal_documents_type;
  END IF;
END
$$;

ALTER TABLE erp_fiscal_documents
  ADD CONSTRAINT ck_erp_fiscal_documents_type
  CHECK (document_type IN ('NFE', 'NFCE', 'NFSE'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_erp_fiscal_documents_origin_type'
  ) THEN
    ALTER TABLE erp_fiscal_documents
      DROP CONSTRAINT ck_erp_fiscal_documents_origin_type;
  END IF;
END
$$;

ALTER TABLE erp_fiscal_documents
  ADD CONSTRAINT ck_erp_fiscal_documents_origin_type
  CHECK (
    origin_type IS NULL OR origin_type IN ('ORDER', 'QUOTE_ORDER', 'DIRECT')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_erp_fiscal_documents_client'
  ) THEN
    ALTER TABLE erp_fiscal_documents
      ADD CONSTRAINT fk_erp_fiscal_documents_client
      FOREIGN KEY (client_id) REFERENCES erp_clients(id);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_fiscal_documents_order_not_null
  ON erp_fiscal_documents (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_erp_fiscal_documents_origin
  ON erp_fiscal_documents (origin_type, origin_id);

CREATE INDEX IF NOT EXISTS idx_erp_fiscal_documents_client
  ON erp_fiscal_documents (client_id);

UPDATE erp_fiscal_documents f
SET
  origin_type = CASE
    WHEN EXISTS (
      SELECT 1
      FROM erp_quotes q
      WHERE q.linked_order_id = f.order_id
    ) THEN 'QUOTE_ORDER'
    ELSE 'ORDER'
  END,
  origin_id = f.order_id
WHERE f.order_id IS NOT NULL
  AND (f.origin_type IS NULL OR f.origin_type = '');

UPDATE erp_fiscal_documents f
SET total_amount = o.total_amount
FROM erp_orders o
WHERE f.order_id = o.id
  AND f.total_amount IS NULL;
