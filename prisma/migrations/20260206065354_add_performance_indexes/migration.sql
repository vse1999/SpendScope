-- Performance indexes for pagination and analytics at scale
-- These indexes are critical for 1M+ record performance
-- Using quoted identifiers for PascalCase table names

-- Primary pagination index for expenses (cursor-based)
CREATE INDEX IF NOT EXISTS idx_expenses_company_date_cursor 
ON "Expense"("companyId", "date" DESC, "id" DESC);

-- For filtered queries (by category)
CREATE INDEX IF NOT EXISTS idx_expenses_company_category_date 
ON "Expense"("companyId", "categoryId", "date" DESC);

-- For user-specific queries
CREATE INDEX IF NOT EXISTS idx_expenses_company_user_date 
ON "Expense"("companyId", "userId", "date" DESC);

-- Index for date range queries (e.g., monthly reports)
CREATE INDEX IF NOT EXISTS idx_expenses_company_date_range 
ON "Expense"("companyId", "date");

-- Index for expense history lookups
CREATE INDEX IF NOT EXISTS idx_expense_history_expense 
ON "expense_history"("expenseId", "editedAt" DESC);

-- Index for user-company lookups
CREATE INDEX IF NOT EXISTS idx_users_company 
ON "User"("companyId") 
WHERE "companyId" IS NOT NULL;

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_company 
ON "Subscription"("companyId", "status");
