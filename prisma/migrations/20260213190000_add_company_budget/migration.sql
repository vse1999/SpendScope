-- CreateEnum
CREATE TYPE "BudgetExhaustionPolicy" AS ENUM ('WARN_ONLY', 'BLOCK_NON_ADMIN', 'BLOCK_ALL');

-- CreateTable
CREATE TABLE "company_budgets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monthlyBudget" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exhaustionPolicy" "BudgetExhaustionPolicy" NOT NULL DEFAULT 'WARN_ONLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_budgets_companyId_key" ON "company_budgets"("companyId");

-- CreateIndex
CREATE INDEX "company_budgets_companyId_isActive_idx" ON "company_budgets"("companyId", "isActive");

-- AddForeignKey
ALTER TABLE "company_budgets" ADD CONSTRAINT "company_budgets_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
