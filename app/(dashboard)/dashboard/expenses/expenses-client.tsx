"use client";

import { Download, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UpgradeToProDialog,
  useUpgradeToProDialog,
} from "@/components/entitlements";
import ExpenseForm from "@/components/expense-form";
import { ExpenseBulkActionsBar } from "./components/expense-bulk-actions-bar";
import { ExpenseFiltersCard } from "./components/expense-filters-card";
import { ExpenseSortSummaryCard } from "./components/expense-sort-summary-card";
import { ExpenseTableSection } from "./components/expense-table-section";
import { useExpensesListState } from "./use-expenses-list-state";
import type { ExpensesClientProps } from "./expenses-client-types";

export function ExpensesClient({
  initialExpenses,
  initialNextCursor,
  categories,
  summary,
  filters,
  initialSortConfig,
  isAdmin,
  billingEnabled,
  children,
}: ExpensesClientProps): React.JSX.Element {
  const {
    open: isUpgradeDialogOpen,
    context: upgradeDialogContext,
    openUpgradeDialog,
    onOpenChange: onUpgradeDialogOpenChange,
  } = useUpgradeToProDialog();

  const {
    router,
    isPending,
    expenses,
    nextCursor,
    isLoadingMore,
    selectedIds,
    isDeleteDialogOpen,
    isExporting,
    search,
    fromDate,
    toDate,
    selectedCategories,
    minAmount,
    maxAmount,
    sortConfig,
    hasFilters,
    hasSelection,
    hasCustomSort,
    selectedCategoryNames,
    setIsDeleteDialogOpen,
    setSelectedIds,
    setSearch,
    setFromDate,
    setToDate,
    setMinAmount,
    setMaxAmount,
    setSelectedCategories,
    toggleSelectAll,
    toggleSelect,
    toggleCategoryFilter,
    applyFilters,
    handleSort,
    removeSort,
    clearAllSorts,
    clearFilters,
    handleBulkDelete,
    handleBulkUpdateCategory,
    handleExport,
    loadMore,
  } = useExpensesListState({
    initialExpenses,
    initialNextCursor,
    filters,
    initialSortConfig,
    categories,
    onUpgradeRequired: openUpgradeDialog,
  });

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Expenses
          </h1>
          <p className="text-muted-foreground">Manage and analyze your expenses</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Button variant="outline" onClick={handleExport} disabled={isExporting || expenses.length === 0}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <ExpenseForm
            initialCategories={categories}
            onUpgradeRequired={openUpgradeDialog}
            onSuccess={() => {
              router.refresh();
              toast.success("Expense added successfully");
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="app-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {summary.count} expense{summary.count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {hasFilters && (
          <Card className="app-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Filters</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {[
                  search && "Search",
                  (fromDate || toDate) && "Date",
                  selectedCategories.length > 0 && "Category",
                  (minAmount || maxAmount) && "Amount",
                ].filter(Boolean).length}
              </div>
              <p className="text-xs text-muted-foreground">Click clear to reset</p>
            </CardContent>
          </Card>
        )}
      </div>

      {children}

      {hasCustomSort && (
        <ExpenseSortSummaryCard
          sortConfig={sortConfig}
          onRemoveSort={removeSort}
          onClearSorts={clearAllSorts}
        />
      )}

      {hasSelection && (
        <ExpenseBulkActionsBar
          selectedCount={selectedIds.size}
          categories={categories}
          isDeleteDialogOpen={isDeleteDialogOpen}
          onDeleteDialogOpenChange={setIsDeleteDialogOpen}
          onBulkUpdateCategory={handleBulkUpdateCategory}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      <ExpenseFiltersCard
        hasFilters={hasFilters}
        isPending={isPending}
        search={search}
        fromDate={fromDate}
        toDate={toDate}
        selectedCategories={selectedCategories}
        selectedCategoryNames={selectedCategoryNames}
        minAmount={minAmount}
        maxAmount={maxAmount}
        categories={categories}
        onSearchChange={setSearch}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onMinAmountChange={setMinAmount}
        onMaxAmountChange={setMaxAmount}
        onToggleCategoryFilter={toggleCategoryFilter}
        onClearSelectedCategories={() => setSelectedCategories([])}
        onClearFilters={clearFilters}
        onApplyFilters={applyFilters}
      />

      <ExpenseTableSection
        expenses={expenses}
        selectedIds={selectedIds}
        hasFilters={hasFilters}
        nextCursor={nextCursor}
        isRefreshing={isPending}
        isLoadingMore={isLoadingMore}
        sortConfig={sortConfig}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelect}
        onSort={handleSort}
        onLoadMore={loadMore}
      />

      <UpgradeToProDialog
        open={isUpgradeDialogOpen}
        context={upgradeDialogContext}
        isAdmin={isAdmin}
        billingEnabled={billingEnabled}
        onOpenChange={onUpgradeDialogOpenChange}
      />
    </div>
  );
}
