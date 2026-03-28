ALTER TABLE erp_products
  ADD COLUMN IF NOT EXISTS icms_orig CHAR(1) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS icms_cst VARCHAR(2) NULL,
  ADD COLUMN IF NOT EXISTS icms_csosn VARCHAR(3) NULL,
  ADD COLUMN IF NOT EXISTS icms_mod_bc VARCHAR(1) NULL,
  ADD COLUMN IF NOT EXISTS icms_p_red_bc NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icms_p_icms NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ipi_cst VARCHAR(2) NULL,
  ADD COLUMN IF NOT EXISTS ipi_c_enq VARCHAR(3) NULL,
  ADD COLUMN IF NOT EXISTS ipi_p_ipi NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pis_cst VARCHAR(2) NOT NULL DEFAULT '49',
  ADD COLUMN IF NOT EXISTS pis_p_pis NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cofins_cst VARCHAR(2) NOT NULL DEFAULT '49',
  ADD COLUMN IF NOT EXISTS cofins_p_cofins NUMERIC(5,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_icms_orig'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_icms_orig
      CHECK (icms_orig ~ '^[0-8]$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_icms_cst'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_icms_cst
      CHECK (icms_cst IS NULL OR icms_cst ~ '^[0-9]{2}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_icms_csosn'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_icms_csosn
      CHECK (icms_csosn IS NULL OR icms_csosn ~ '^[0-9]{3}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_icms_mod_bc'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_icms_mod_bc
      CHECK (icms_mod_bc IS NULL OR icms_mod_bc ~ '^[0-3]$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_ipi_cst'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_ipi_cst
      CHECK (ipi_cst IS NULL OR ipi_cst ~ '^[0-9]{2}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_ipi_c_enq'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_ipi_c_enq
      CHECK (ipi_c_enq IS NULL OR ipi_c_enq ~ '^[0-9]{3}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_pis_cst'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_pis_cst
      CHECK (pis_cst ~ '^[0-9]{2}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_cofins_cst'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_cofins_cst
      CHECK (cofins_cst ~ '^[0-9]{2}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_products_tax_percent'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT ck_erp_products_tax_percent
      CHECK (
        icms_p_red_bc BETWEEN 0 AND 100 AND
        icms_p_icms BETWEEN 0 AND 100 AND
        ipi_p_ipi BETWEEN 0 AND 100 AND
        pis_p_pis BETWEEN 0 AND 100 AND
        cofins_p_cofins BETWEEN 0 AND 100
      );
  END IF;
END
$$;
