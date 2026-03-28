CREATE TABLE IF NOT EXISTS erp_categories (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NULL,
  CONSTRAINT uq_erp_categories_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_erp_categories_name
  ON erp_categories (name);

CREATE INDEX IF NOT EXISTS idx_erp_categories_active
  ON erp_categories (is_active);

ALTER TABLE erp_products
  ADD COLUMN IF NOT EXISTS category_id BIGINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_erp_products_category'
  ) THEN
    ALTER TABLE erp_products
      ADD CONSTRAINT fk_erp_products_category
      FOREIGN KEY (category_id)
      REFERENCES erp_categories(id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_erp_products_category_id
  ON erp_products (category_id);
