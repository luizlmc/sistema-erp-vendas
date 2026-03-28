CREATE TABLE IF NOT EXISTS erp_products (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  stock_qty NUMERIC(14, 3) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NULL,
  CONSTRAINT uq_erp_products_sku UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS idx_erp_products_name
  ON erp_products (name);

CREATE INDEX IF NOT EXISTS idx_erp_products_active
  ON erp_products (is_active);
