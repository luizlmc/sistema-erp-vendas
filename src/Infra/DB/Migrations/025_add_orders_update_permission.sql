INSERT INTO erp_permissions (code, description) VALUES
  ('orders.update', 'Atualizar pedidos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'ADMIN', p.id
FROM erp_permissions p
WHERE p.code = 'orders.update'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'USER', p.id
FROM erp_permissions p
WHERE p.code = 'orders.update'
ON CONFLICT (role, permission_id) DO NOTHING;
