CREATE TABLE IF NOT EXISTS copilot_ai_advice (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  expense_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  advice_type TEXT NOT NULL,
  status TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  confidence DOUBLE PRECISION,
  explanation TEXT,
  recommendation TEXT,
  payload_json TEXT,
  input_hash TEXT NOT NULL,
  latency_ms INTEGER,
  token_usage INTEGER,
  error_message TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS copilot_ai_advice_alert_type_key
  ON copilot_ai_advice (alert_id, advice_type);

CREATE INDEX IF NOT EXISTS copilot_ai_advice_company_status_idx
  ON copilot_ai_advice (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS copilot_ai_advice_alert_idx
  ON copilot_ai_advice (alert_id);

