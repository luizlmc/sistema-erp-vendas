CREATE TABLE IF NOT EXISTS erp_clients (
  id BIGSERIAL PRIMARY KEY,
  document_type VARCHAR(10) NOT NULL,
  document VARCHAR(20) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(30) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_erp_clients_document UNIQUE (document_type, document)
);

CREATE INDEX IF NOT EXISTS idx_erp_clients_name
  ON erp_clients (name);

CREATE INDEX IF NOT EXISTS idx_erp_clients_active
  ON erp_clients (is_active);
