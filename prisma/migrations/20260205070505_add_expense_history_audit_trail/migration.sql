-- CreateTable
CREATE TABLE "expense_history" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "editedBy" TEXT NOT NULL,
    "editedByName" TEXT,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldValues" TEXT NOT NULL,
    "newValues" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "expense_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_history_expenseId_idx" ON "expense_history"("expenseId");

-- CreateIndex
CREATE INDEX "expense_history_editedBy_idx" ON "expense_history"("editedBy");

-- CreateIndex
CREATE INDEX "expense_history_editedAt_idx" ON "expense_history"("editedAt");

-- AddForeignKey
ALTER TABLE "expense_history" ADD CONSTRAINT "expense_history_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
