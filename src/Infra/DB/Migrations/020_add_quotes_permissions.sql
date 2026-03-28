INSERT INTO erp_permissions (code, description) VALUES
  ('quotes.read', 'Listar e consultar orcamentos'),
  ('quotes.create', 'Criar orcamentos'),
  ('quotes.approve', 'Aprovar orcamentos'),
  ('quotes.reject', 'Reprovar orcamentos'),
  ('quotes.cancel', 'Cancelar orcamentos'),
  ('quotes.convert', 'Converter orcamento em pedido')
ON CONFLICT (code) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'ADMIN', p.id
FROM erp_permissions p
WHERE p.code IN (
  'quotes.read',
  'quotes.create',
  'quotes.approve',
  'quotes.reject',
  'quotes.cancel',
  'quotes.convert'
)
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'USER', p.id
FROM erp_permissions p
WHERE p.code IN (
  'quotes.read',
  'quotes.create'
)
ON CONFLICT (role, permission_id) DO NOTHING;
