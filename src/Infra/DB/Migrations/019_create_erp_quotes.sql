CREATE TABLE IF NOT EXISTS erp_quotes (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  client_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFTING',
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  linked_order_id BIGINT NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  canceled_at TIMESTAMP NULL,
  converted_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT ck_erp_quotes_status CHECK (status IN ('DRAFTING', 'PENDING', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELED')),
  CONSTRAINT fk_erp_quotes_client FOREIGN KEY (client_id) REFERENCES erp_clients(id),
  CONSTRAINT fk_erp_quotes_order FOREIGN KEY (linked_order_id) REFERENCES erp_orders(id),
  CONSTRAINT fk_erp_quotes_created_by FOREIGN KEY (created_by_user_id) REFERENCES erp_users(id)
);

CREATE INDEX IF NOT EXISTS idx_erp_quotes_client
  ON erp_quotes (client_id);

CREATE INDEX IF NOT EXISTS idx_erp_quotes_status
  ON erp_quotes (status);

CREATE INDEX IF NOT EXISTS idx_erp_quotes_created_at
  ON erp_quotes (created_at DESC);

CREATE TABLE IF NOT EXISTS erp_quote_items (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT NOT NULL,
  line_no INTEGER NOT NULL,
  product_id BIGINT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  line_total NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_erp_quote_items_qty CHECK (quantity > 0),
  CONSTRAINT fk_erp_quote_items_quote FOREIGN KEY (quote_id) REFERENCES erp_quotes(id),
  CONSTRAINT fk_erp_quote_items_product FOREIGN KEY (product_id) REFERENCES erp_products(id),
  CONSTRAINT uq_erp_quote_items_line UNIQUE (quote_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_erp_quote_items_quote
  ON erp_quote_items (quote_id);

CREATE INDEX IF NOT EXISTS idx_erp_quote_items_product
  ON erp_quote_items (product_id);
