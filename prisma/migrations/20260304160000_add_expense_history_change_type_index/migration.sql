-- Speeds up copilot resolution lookups that filter by expense and change type.
CREATE INDEX IF NOT EXISTS idx_expense_history_expense_change_type
ON "expense_history"("expenseId", "changeType");
