CREATE TABLE IF NOT EXISTS erp_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL,
  user_login VARCHAR(80) NULL,
  user_role VARCHAR(20) NULL,
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id VARCHAR(64) NULL,
  http_method VARCHAR(10) NOT NULL,
  path VARCHAR(255) NOT NULL,
  status_code INTEGER NOT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  correlation_id VARCHAR(80) NULL,
  request_payload TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_audit_log_created_at
  ON erp_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_erp_audit_log_resource
  ON erp_audit_log (resource);
