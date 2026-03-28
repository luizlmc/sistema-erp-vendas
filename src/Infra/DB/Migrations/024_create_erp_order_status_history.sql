CREATE TABLE IF NOT EXISTS erp_order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  old_status VARCHAR(20) NULL,
  new_status VARCHAR(20) NOT NULL,
  action VARCHAR(30) NOT NULL,
  note VARCHAR(500) NULL,
  changed_by_user_id BIGINT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_erp_order_status_history_order FOREIGN KEY (order_id) REFERENCES erp_orders(id),
  CONSTRAINT fk_erp_order_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES erp_users(id)
);

CREATE INDEX IF NOT EXISTS idx_erp_order_status_history_order
  ON erp_order_status_history (order_id, changed_at DESC);

INSERT INTO erp_permissions (code, description) VALUES
  ('orders.history', 'Consultar historico de status de pedidos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'ADMIN', p.id
FROM erp_permissions p
WHERE p.code = 'orders.history'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'USER', p.id
FROM erp_permissions p
WHERE p.code = 'orders.history'
ON CONFLICT (role, permission_id) DO NOTHING;
