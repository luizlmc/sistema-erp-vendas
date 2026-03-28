CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE erp_users
SET role = UPPER(TRIM(role))
WHERE role IS NOT NULL;

UPDATE erp_users
SET role = 'USER'
WHERE role IS NULL
   OR role NOT IN ('ADMIN', 'USER');

UPDATE erp_users
SET role = 'ADMIN'
WHERE LOWER(login) = 'admin';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_erp_users_role'
  ) THEN
    ALTER TABLE erp_users
      ADD CONSTRAINT ck_erp_users_role
      CHECK (role IN ('ADMIN', 'USER'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_erp_users_is_active
  ON erp_users (is_active);

CREATE INDEX IF NOT EXISTS idx_erp_users_login_lower
  ON erp_users ((LOWER(login)));

UPDATE erp_users
SET password_hash = crypt('admin123', gen_salt('bf', 12))
WHERE LOWER(login) = 'admin'
  AND password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
