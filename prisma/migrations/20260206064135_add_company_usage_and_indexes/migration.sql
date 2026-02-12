-- CreateTable
CREATE TABLE "company_usage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monthlyExpenses" INTEGER NOT NULL DEFAULT 0,
    "currentMonth" INTEGER NOT NULL,
    "maxExpenses" INTEGER NOT NULL DEFAULT 100,
    "maxUsers" INTEGER NOT NULL DEFAULT 3,
    "maxCategories" INTEGER NOT NULL DEFAULT 5,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_usage_companyId_key" ON "company_usage"("companyId");

-- CreateIndex
CREATE INDEX "company_usage_companyId_currentMonth_idx" ON "company_usage"("companyId", "currentMonth");

-- AddForeignKey
ALTER TABLE "company_usage" ADD CONSTRAINT "company_usage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
