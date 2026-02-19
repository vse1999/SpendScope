"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MAX_SORT_LEVELS,
  getSortFieldLabel,
  getSortPriorityLabel,
  type MultiSortConfig,
  type ExpenseSortField,
} from "@/lib/expense-sorting";

interface ExpenseSortSummaryCardProps {
  sortConfig: MultiSortConfig;
  onRemoveSort: (field: ExpenseSortField) => void;
  onClearSorts: () => void;
}

export function ExpenseSortSummaryCard({
  sortConfig,
  onRemoveSort,
  onClearSorts,
}: ExpenseSortSummaryCardProps): React.JSX.Element {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted-foreground">Sort by:</span>
          {sortConfig.map((sort, index) => (
            <Badge
              key={sort.field}
              variant={index === 0 ? "default" : "secondary"}
              className="flex items-center gap-1.5 px-2.5 py-1"
            >
              <span>{getSortFieldLabel(sort.field)}</span>
              {sort.direction === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              <span className="ml-0.5 text-xs opacity-70">{getSortPriorityLabel(index)}</span>
              <button
                onClick={() => onRemoveSort(sort.field)}
                className="ml-1 hover:text-destructive focus:outline-none"
                aria-label={`Remove ${getSortFieldLabel(sort.field)} sort`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={onClearSorts} className="h-7 px-2 text-xs">
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: Click a column to sort by that column only. Shift+click to add secondary sorts (up to {MAX_SORT_LEVELS} levels).
        </p>
      </CardContent>
    </Card>
  );
}
