INSERT INTO erp_users (login, full_name, password_hash, is_active)
SELECT
  'admin',
  'Administrador',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM erp_users
  WHERE login = 'admin'
);

UPDATE erp_users
SET role = 'ADMIN'
WHERE login = 'admin';
