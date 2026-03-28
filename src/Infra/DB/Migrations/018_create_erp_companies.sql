CREATE TABLE IF NOT EXISTS erp_companies (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  legal_name VARCHAR(180) NOT NULL,
  trade_name VARCHAR(180),
  porte VARCHAR(30) NOT NULL,
  state_registration VARCHAR(30),
  cnae VARCHAR(20),
  tax_regime VARCHAR(2) NOT NULL CHECK (tax_regime IN ('SN', 'LP', 'LR')),
  crt VARCHAR(40) NOT NULL,
  icms_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
  iss_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
  cep VARCHAR(12),
  street VARCHAR(180),
  number VARCHAR(20),
  district VARCHAR(120),
  city VARCHAR(120),
  uf VARCHAR(2),
  cert_password VARCHAR(120),
  cert_status VARCHAR(10) NOT NULL DEFAULT 'valid' CHECK (cert_status IN ('valid', 'invalid')),
  cert_due_date DATE,
  fiscal_contact VARCHAR(120),
  fiscal_email VARCHAR(180),
  phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_erp_companies_legal_name
  ON erp_companies (legal_name);

CREATE INDEX IF NOT EXISTS idx_erp_companies_tax_regime
  ON erp_companies (tax_regime);

CREATE INDEX IF NOT EXISTS idx_erp_companies_active
  ON erp_companies (is_active);

INSERT INTO erp_permissions (code, description) VALUES
  ('companies.read', 'Listar e consultar empresas'),
  ('companies.create', 'Criar empresas'),
  ('companies.update', 'Atualizar empresas'),
  ('companies.delete', 'Inativar empresas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'ADMIN', p.id
FROM erp_permissions p
WHERE p.code IN (
  'companies.read',
  'companies.create',
  'companies.update',
  'companies.delete'
)
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO erp_role_permissions (role, permission_id)
SELECT 'USER', p.id
FROM erp_permissions p
WHERE p.code IN (
  'companies.read'
)
ON CONFLICT (role, permission_id) DO NOTHING;
