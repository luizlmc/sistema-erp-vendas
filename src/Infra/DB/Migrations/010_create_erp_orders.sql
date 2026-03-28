CREATE TABLE IF NOT EXISTS erp_orders (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  canceled_at TIMESTAMP NULL,
  CONSTRAINT ck_erp_orders_status CHECK (status IN ('OPEN', 'CANCELED')),
  CONSTRAINT fk_erp_orders_client FOREIGN KEY (client_id) REFERENCES erp_clients(id),
  CONSTRAINT fk_erp_orders_created_by FOREIGN KEY (created_by_user_id) REFERENCES erp_users(id)
);

CREATE INDEX IF NOT EXISTS idx_erp_orders_client
  ON erp_orders (client_id);

CREATE INDEX IF NOT EXISTS idx_erp_orders_status
  ON erp_orders (status);

CREATE TABLE IF NOT EXISTS erp_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  line_no INTEGER NOT NULL,
  product_id BIGINT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  line_total NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_erp_order_items_qty CHECK (quantity > 0),
  CONSTRAINT fk_erp_order_items_order FOREIGN KEY (order_id) REFERENCES erp_orders(id),
  CONSTRAINT fk_erp_order_items_product FOREIGN KEY (product_id) REFERENCES erp_products(id),
  CONSTRAINT uq_erp_order_items_line UNIQUE (order_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_erp_order_items_order
  ON erp_order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_erp_order_items_product
  ON erp_order_items (product_id);
