CREATE TABLE IF NOT EXISTS erp_quote_status_history (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT NOT NULL,
  old_status VARCHAR(20) NULL,
  new_status VARCHAR(20) NOT NULL,
  action VARCHAR(30) NOT NULL,
  note VARCHAR(500) NULL,
  changed_by_user_id BIGINT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_erp_quote_status_history_quote FOREIGN KEY (quote_id) REFERENCES erp_quotes(id),
  CONSTRAINT fk_erp_quote_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES erp_users(id)
);

CREATE INDEX IF NOT EXISTS idx_erp_quote_status_history_quote
  ON erp_quote_status_history (quote_id, changed_at DESC);
