"use client";

import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSortPriorityLabel, type MultiSortConfig } from "@/lib/expense-sorting";
import type { Expense, SortField } from "../expenses-client-types";

interface ExpenseTableSectionProps {
  expenses: Expense[];
  selectedIds: Set<string>;
  hasFilters: boolean;
  nextCursor: string | null;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  sortConfig: MultiSortConfig;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onSort: (field: SortField, event?: React.MouseEvent) => void;
  onLoadMore: () => Promise<void>;
}

const MOBILE_SORT_OPTIONS: Array<{ field: SortField; label: string }> = [
  { field: "date", label: "Date" },
  { field: "category", label: "Category" },
  { field: "user", label: "User" },
  { field: "amount", label: "Amount" },
];

function renderSortIcon(field: SortField, sortConfig: MultiSortConfig): React.JSX.Element {
  const sortIndex = sortConfig.findIndex((sort) => sort.field === field);

  if (sortIndex === -1) {
    return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
  }

  const sort = sortConfig[sortIndex];
  const isPrimary = sortIndex === 0;

  return (
    <div className="flex items-center gap-1">
      {sort.direction === "asc" ? (
        <ArrowUp className={`h-4 w-4 ${isPrimary ? "text-primary" : "text-muted-foreground"}`} />
      ) : (
        <ArrowDown className={`h-4 w-4 ${isPrimary ? "text-primary" : "text-muted-foreground"}`} />
      )}
      {sortConfig.length > 1 && (
        <span className={`text-xs ${isPrimary ? "font-medium text-primary" : "text-muted-foreground"}`}>
          {getSortPriorityLabel(sortIndex)}
        </span>
      )}
    </div>
  );
}

function MobileSortButton({
  field,
  label,
  sortConfig,
  isRefreshing,
  onSort,
}: {
  field: SortField;
  label: string;
  sortConfig: MultiSortConfig;
  isRefreshing: boolean;
  onSort: (field: SortField) => void;
}): React.JSX.Element {
  const isActive = sortConfig.some((sort) => sort.field === field);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`w-full justify-between ${isActive ? "border-primary/40 bg-primary/10" : ""}`}
      disabled={isRefreshing}
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      {renderSortIcon(field, sortConfig)}
    </Button>
  );
}

export function ExpenseTableSection({
  expenses,
  selectedIds,
  hasFilters,
  nextCursor,
  isRefreshing,
  isLoadingMore,
  sortConfig,
  onToggleSelectAll,
  onToggleSelect,
  onSort,
  onLoadMore,
}: ExpenseTableSectionProps): React.JSX.Element {
  const allVisibleSelected = expenses.length > 0 && selectedIds.size === expenses.length;

  return (
    <Card className="relative">
      {isRefreshing && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-md border bg-background/95 px-2 py-1 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          Updating...
        </div>
      )}
      <CardContent className="p-0">
        {expenses.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center px-4 text-center text-muted-foreground">
            <Calendar className="mb-2 h-8 w-8" />
            <p>No expenses found</p>
            {hasFilters && <p className="text-sm">Try adjusting your filters</p>}
          </div>
        ) : (
          <>
            <div className="border-b p-4 md:hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Visible rows</p>
                    <p className="text-xs text-muted-foreground">Select all expenses in the current list</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={onToggleSelectAll}
                      aria-label="Select all visible expenses"
                    />
                    <span className="text-xs font-medium text-muted-foreground">All</span>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {MOBILE_SORT_OPTIONS.map((option) => (
                    <MobileSortButton
                      key={option.field}
                      field={option.field}
                      label={option.label}
                      sortConfig={sortConfig}
                      isRefreshing={isRefreshing}
                      onSort={(field) => onSort(field)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y md:hidden">
              {expenses.map((expense) => (
                <div key={expense.id} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(expense.id)}
                      onCheckedChange={() => onToggleSelect(expense.id)}
                      aria-label={`Select expense: ${expense.description}`}
                    />

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-tight break-words">
                            {expense.description}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {format(new Date(expense.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums">
                          ${expense.amount.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: expense.category?.color || "#888888",
                            color: expense.category?.color || "#888888",
                          }}
                        >
                          {expense.category?.name || "Uncategorized"}
                        </Badge>

                        <div className="flex min-w-0 items-center gap-2 rounded-full bg-muted/50 px-2.5 py-1">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                            {expense.user?.name?.charAt(0) || expense.user?.email?.charAt(0) || "?"}
                          </div>
                          <span className="truncate text-xs text-muted-foreground">
                            {expense.user?.name || expense.user?.email || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={onToggleSelectAll}
                      />
                    </TableHead>
                    <TableHead
                      className={`cursor-pointer select-none transition-colors hover:bg-muted/50 ${isRefreshing ? "pointer-events-none opacity-70" : ""}`}
                      onClick={(event) => onSort("date", event as unknown as React.MouseEvent)}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {renderSortIcon("date", sortConfig)}
                      </div>
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead
                      className={`cursor-pointer select-none transition-colors hover:bg-muted/50 ${isRefreshing ? "pointer-events-none opacity-70" : ""}`}
                      onClick={(event) => onSort("category", event as unknown as React.MouseEvent)}
                    >
                      <div className="flex items-center gap-1">
                        Category
                        {renderSortIcon("category", sortConfig)}
                      </div>
                    </TableHead>
                    <TableHead
                      className={`cursor-pointer select-none transition-colors hover:bg-muted/50 ${isRefreshing ? "pointer-events-none opacity-70" : ""}`}
                      onClick={(event) => onSort("user", event as unknown as React.MouseEvent)}
                    >
                      <div className="flex items-center gap-1">
                        User
                        {renderSortIcon("user", sortConfig)}
                      </div>
                    </TableHead>
                    <TableHead
                      className={`cursor-pointer select-none text-right transition-colors hover:bg-muted/50 ${isRefreshing ? "pointer-events-none opacity-70" : ""}`}
                      onClick={(event) => onSort("amount", event as unknown as React.MouseEvent)}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Amount
                        {renderSortIcon("amount", sortConfig)}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(expense.id)}
                          onCheckedChange={() => onToggleSelect(expense.id)}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: expense.category?.color || "#888888",
                            color: expense.category?.color || "#888888",
                          }}
                        >
                          {expense.category?.name || "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                            {expense.user?.name?.charAt(0) || expense.user?.email?.charAt(0) || "?"}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {expense.user?.name || expense.user?.email || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${expense.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {(nextCursor || isLoadingMore) && (
          <div className="flex items-center justify-center border-t p-4">
            <Button
              variant="outline"
              onClick={() => {
                void onLoadMore();
              }}
              disabled={isLoadingMore || isRefreshing || !nextCursor}
            >
              {isLoadingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Load More
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
