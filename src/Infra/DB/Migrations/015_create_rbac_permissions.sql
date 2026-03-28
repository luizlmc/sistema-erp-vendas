CREATE TABLE IF NOT EXISTS erp_permissions (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_role_permissions (
  role VARCHAR(20) NOT NULL,
  permission_id BIGINT NOT NULL REFERENCES erp_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_erp_role_permissions PRIMARY KEY (role, permission_id),
  CONSTRAINT ck_erp_role_permissions_role CHECK (role IN ('ADMIN', 'USER'))
);

CREATE TABLE IF NOT EXISTS erp_user_permissions (
  user_id BIGINT NOT NULL REFERENCES erp_users(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES erp_permissions(id) ON DELETE CASCADE,
  is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_erp_user_permissions PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_erp_permissions_code
  ON erp_permissions (code);

CREATE INDEX IF NOT EXISTS idx_erp_user_permissions_user
  ON erp_user_permissions (user_id);

INSERT INTO erp_permissions (code, description) VALUES
  ('users.read', 'Listar e consultar usuarios'),
  ('users.create', 'Criar usuarios'),
  ('users.update', 'Atualizar usuarios'),
  ('users.delete', 'Inativar usuarios'),

  ('clients.read', 'Listar e consultar clientes'),
  ('clients.create', 'Criar clientes'),
  ('clients.update', 'Atualizar clientes'),
  ('clients.delete', 'Inativar clientes'),

  ('categories.read', 'Listar e consultar categorias'),
  ('categories.create', 'Criar categorias'),
  ('categories.update', 'Atualizar categorias'),
  ('categories.delete', 'Inativar categorias'),

  ('products.read', 'Listar e consultar produtos'),
  ('products.create', 'Criar produtos'),
  ('products.update', 'Atualizar produtos'),
  ('products.delete', 'Inativar produtos'),

  ('orders.read', 'Listar e consultar pedidos'),
  ('orders.create', 'Criar pedidos'),
  ('orders.cancel', 'Cancelar pedidos'),
  ('orders.confirm', 'Confirmar pedidos'),
  ('orders.invoice', 'Faturar pedidos'),

  ('receivables.read', 'Listar e consultar contas a receber'),
  ('receivables.payments.create', 'Registrar pagamento de titulo'),
  ('receivables.payments.reverse', 'Estornar pagamento de titulo'),
  ('receivables.cancel', 'Cancelar titulo'),

  ('fiscal.provider.read', 'Consultar provider fiscal'),
  ('fiscal.documents.read', 'Listar e consultar documentos fiscais'),
  ('fiscal.documents.emit', 'Emitir documento fiscal'),
  ('fiscal.documents.cancel', 'Cancelar documento fiscal'),

  ('dashboard.read', 'Consultar dashboard')
ON CONFLICT (code) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'ADMIN', p.id
FROM erp_permissions p
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'USER', p.id
FROM erp_permissions p
WHERE p.code IN (
  'clients.read',
  'categories.read',
  'products.read',
  'orders.read',
  'orders.create',
  'receivables.read',
  'fiscal.provider.read',
  'fiscal.documents.read',
  'dashboard.read'
)
ON CONFLICT (role, permission_id) DO NOTHING;
