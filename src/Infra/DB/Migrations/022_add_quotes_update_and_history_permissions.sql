INSERT INTO erp_permissions (code, description) VALUES
  ('quotes.update', 'Atualizar orcamentos'),
  ('quotes.history', 'Consultar historico de status de orcamentos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'ADMIN', p.id
FROM erp_permissions p
WHERE p.code IN ('quotes.update', 'quotes.history')
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'USER', p.id
FROM erp_permissions p
WHERE p.code IN ('quotes.update', 'quotes.history')
ON CONFLICT (role, permission_id) DO NOTHING;
