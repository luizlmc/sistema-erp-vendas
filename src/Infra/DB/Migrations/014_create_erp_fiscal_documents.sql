CREATE TABLE IF NOT EXISTS erp_fiscal_documents (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  document_type VARCHAR(20) NOT NULL DEFAULT 'NFE',
  series VARCHAR(10) NOT NULL DEFAULT '1',
  number VARCHAR(20) NOT NULL,
  access_key VARCHAR(60) NULL,
  protocol VARCHAR(40) NULL,
  xml_content TEXT NULL,
  error_message VARCHAR(500) NULL,
  issued_at TIMESTAMP NULL,
  canceled_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_erp_fiscal_documents_order UNIQUE (order_id),
  CONSTRAINT fk_erp_fiscal_documents_order FOREIGN KEY (order_id) REFERENCES erp_orders(id),
  CONSTRAINT ck_erp_fiscal_documents_status CHECK (status IN ('PENDING', 'AUTHORIZED', 'REJECTED', 'CANCELED')),
  CONSTRAINT ck_erp_fiscal_documents_type CHECK (document_type IN ('NFE'))
);

CREATE INDEX IF NOT EXISTS idx_erp_fiscal_documents_status
  ON erp_fiscal_documents (status);

CREATE INDEX IF NOT EXISTS idx_erp_fiscal_documents_access_key
  ON erp_fiscal_documents (access_key);
