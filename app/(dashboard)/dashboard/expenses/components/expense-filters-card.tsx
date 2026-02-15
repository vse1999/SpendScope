"use client";

import { ChevronDown, Filter, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Category } from "../expenses-client-types";

interface ExpenseFiltersCardProps {
  hasFilters: boolean;
  isPending: boolean;
  search: string;
  fromDate: string;
  toDate: string;
  selectedCategories: string[];
  selectedCategoryNames: string[];
  minAmount: string;
  maxAmount: string;
  categories: Category[];
  onSearchChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onMinAmountChange: (value: string) => void;
  onMaxAmountChange: (value: string) => void;
  onToggleCategoryFilter: (categoryId: string, checked: boolean) => void;
  onClearSelectedCategories: () => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
}

export function ExpenseFiltersCard({
  hasFilters,
  isPending,
  search,
  fromDate,
  toDate,
  selectedCategories,
  selectedCategoryNames,
  minAmount,
  maxAmount,
  categories,
  onSearchChange,
  onFromDateChange,
  onToDateChange,
  onMinAmountChange,
  onMaxAmountChange,
  onToggleCategoryFilter,
  onClearSelectedCategories,
  onClearFilters,
  onApplyFilters,
}: ExpenseFiltersCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
            <Button size="sm" onClick={onApplyFilters} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Apply
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <Input
            placeholder="Search descriptions..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onApplyFilters()}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">From Date</label>
          <Input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">To Date</label>
          <Input type="date" value={toDate} onChange={(event) => onToDateChange(event.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Categories</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-left font-normal">
                <span className="truncate">
                  {selectedCategoryNames.length === 0
                    ? "Select categories..."
                    : `${selectedCategoryNames.length} selected`}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuLabel>Filter by categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No categories available</div>
              ) : (
                categories.map((category) => {
                  const checked = selectedCategories.includes(category.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={category.id}
                      checked={checked}
                      onCheckedChange={(value) => onToggleCategoryFilter(category.id, value === true)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                        <span>{category.name}</span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  );
                })
              )}
              {selectedCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <button
                    type="button"
                    onClick={onClearSelectedCategories}
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Clear categories
                  </button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Min Amount</label>
          <Input
            type="number"
            placeholder="0"
            value={minAmount}
            onChange={(event) => onMinAmountChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onApplyFilters()}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Max Amount</label>
          <Input
            type="number"
            placeholder="max"
            value={maxAmount}
            onChange={(event) => onMaxAmountChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onApplyFilters()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
