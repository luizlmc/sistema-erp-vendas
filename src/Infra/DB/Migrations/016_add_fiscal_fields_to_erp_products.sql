ALTER TABLE erp_products
  ADD COLUMN IF NOT EXISTS gtin VARCHAR(14) NOT NULL DEFAULT 'SEM GTIN',
  ADD COLUMN IF NOT EXISTS ncm VARCHAR(8) NOT NULL DEFAULT '00000000',
  ADD COLUMN IF NOT EXISTS cest VARCHAR(7) NULL,
  ADD COLUMN IF NOT EXISTS cfop VARCHAR(4) NOT NULL DEFAULT '5102',
  ADD COLUMN IF NOT EXISTS u_com VARCHAR(6) NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS u_trib VARCHAR(6) NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS extipi VARCHAR(3) NULL,
  ADD COLUMN IF NOT EXISTS cbenef VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS nve VARCHAR(6) NULL,
  ADD COLUMN IF NOT EXISTS ind_escala CHAR(1) NULL,
  ADD COLUMN IF NOT EXISTS cnpj_fab VARCHAR(14) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_gtin'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_gtin
      CHECK (gtin = 'SEM GTIN' OR gtin ~ '^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$|^[0-9]{14}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_ncm'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_ncm
      CHECK (ncm ~ '^[0-9]{8}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_cfop'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_cfop
      CHECK (cfop ~ '^[0-9]{4}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_cest'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_cest
      CHECK (cest IS NULL OR cest ~ '^[0-9]{7}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_ind_escala'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_ind_escala
      CHECK (ind_escala IS NULL OR ind_escala IN ('S', 'N'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_erp_products_ncm
  ON erp_products (ncm);

CREATE INDEX IF NOT EXISTS idx_erp_products_gtin
  ON erp_products (gtin);
