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
  return (
    <Card className="relative">
      {isRefreshing && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-md border bg-background/95 px-2 py-1 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          Updating...
        </div>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={expenses.length > 0 && selectedIds.size === expenses.length}
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
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Calendar className="mb-2 h-8 w-8" />
                    <p>No expenses found</p>
                    {hasFilters && <p className="text-sm">Try adjusting your filters</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
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
              ))
            )}
          </TableBody>
        </Table>

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
