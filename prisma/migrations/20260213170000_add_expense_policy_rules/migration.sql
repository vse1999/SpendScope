CREATE TABLE IF NOT EXISTS expense_policy_rules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES "Company"(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  category_id TEXT REFERENCES "Category"(id) ON DELETE CASCADE,
  threshold_usd NUMERIC(10, 2) NOT NULL,
  requires_receipt_above_usd NUMERIC(10, 2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS expense_policy_rules_global_unique
  ON expense_policy_rules (company_id, scope_type)
  WHERE scope_type = 'GLOBAL' AND active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS expense_policy_rules_category_unique
  ON expense_policy_rules (company_id, category_id, scope_type)
  WHERE scope_type = 'CATEGORY' AND active = TRUE;

CREATE INDEX IF NOT EXISTS expense_policy_rules_company_scope_idx
  ON expense_policy_rules (company_id, scope_type, active);

