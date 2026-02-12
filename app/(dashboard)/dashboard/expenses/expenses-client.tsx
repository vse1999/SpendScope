"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { 
  Search, 
  Download, 
  Trash2, 
  Filter, 
  X, 
  ChevronDown,
  Plus,
  Calendar,
  Tag,
  DollarSign,
  CheckSquare,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ExpenseForm from "@/components/expense-form";
import {
  bulkDeleteExpenses,
  bulkUpdateCategory,
  exportExpensesCSV,
  getExpensesWithFilters,
} from "@/app/actions/expenses";
import { 
  serializeMultiSort, 
  type MultiSortConfig, 
  type ExpenseSortField, 
  type SortConfig,
  MAX_SORT_LEVELS, 
  getSortFieldLabel,
  getDefaultDirection,
  getSortPriorityLabel
} from "@/lib/expense-sorting";

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category?: {
    id?: string;
    name: string;
    color: string;
  };
  user?: {
    id?: string;
    name: string | null;
    email: string | null;
  };
}

interface ServerExpenseItem extends Omit<Expense, "amount" | "date"> {
  amount: string | number;
  date: string | Date;
}

interface Category {
  id: string;
  name: string;
  color: string;
  _count?: {
    expenses: number;
  };
}

interface ExpensesClientProps {
  initialExpenses: Expense[];
  initialNextCursor: string | null;
  categories: Category[];
  summary: {
    count: number;
    total: number;
  };
  filters: {
    cursor?: string;
    dateFrom?: Date;
    dateTo?: Date;
    categoryIds?: string[];
    amountMin?: number;
    amountMax?: number;
    search?: string;
    sort?: MultiSortConfig;
  };
  currentUserId: string;
  companyId: string;
  initialSortConfig: MultiSortConfig;
}

type SortField = ExpenseSortField;

export function ExpensesClient({
  initialExpenses,
  initialNextCursor,
  categories,
  summary,
  filters,
  currentUserId,
  companyId,
  initialSortConfig,
}: ExpensesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // State - sync with props when they change
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Sync local state when server-provided data changes (after filters/sort navigation)
  useEffect(() => {
    setExpenses(initialExpenses);
    setNextCursor(initialNextCursor);
    setIsLoadingMore(false);
  }, [initialExpenses, initialNextCursor]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter state - sync with URL params
  const [search, setSearch] = useState(filters.search || "");
  const [fromDate, setFromDate] = useState(filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "");
  const [toDate, setToDate] = useState(filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(filters.categoryIds || []);
  const [minAmount, setMinAmount] = useState(filters.amountMin?.toString() || "");
  const [maxAmount, setMaxAmount] = useState(filters.amountMax?.toString() || "");
  
  // Multi-column sort state
  const [sortConfig, setSortConfig] = useState<MultiSortConfig>(initialSortConfig);

  // Sync filter state when filters prop changes (e.g., back/forward navigation)
  useEffect(() => {
    setSearch(filters.search || "");
    setFromDate(filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "");
    setToDate(filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "");
    setSelectedCategories(filters.categoryIds || []);
    setMinAmount(filters.amountMin?.toString() || "");
    setMaxAmount(filters.amountMax?.toString() || "");
    
    // Sync sort state
    if (filters.sort) {
      setSortConfig(filters.sort);
    }
  }, [filters]);

  // Handle selection
  const toggleSelectAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleCategoryFilter = (categoryId: string, checked: boolean): void => {
    setSelectedCategories((previous) => {
      if (checked) {
        if (previous.includes(categoryId)) {
          return previous;
        }
        return [...previous, categoryId];
      }
      return previous.filter((id) => id !== categoryId);
    });
  };

  // Apply filters - preserves existing params but removes cursor
  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    
    // Update filter params
    if (search) params.set("search", search);
    else params.delete("search");
    
    if (fromDate) params.set("from", fromDate);
    else params.delete("from");
    
    if (toDate) params.set("to", toDate);
    else params.delete("to");
    
    if (selectedCategories.length > 0) params.set("category", selectedCategories.join(","));
    else params.delete("category");
    
    if (minAmount) params.set("minAmount", minAmount);
    else params.delete("minAmount");
    
    if (maxAmount) params.set("maxAmount", maxAmount);
    else params.delete("maxAmount");
    
    // IMPORTANT: Reset cursor when applying new filters
    params.delete("cursor");
    
    // Clear local expenses to prevent flash of old data
    setExpenses([]);
    
    startTransition(() => {
      router.push(`/dashboard/expenses?${params.toString()}`);
    });
  };
  
  /**
   * Handle sort click with multi-column support
   * - Click: Toggle field direction or add as new sort level (up to 3)
   * - Shift+Click: Replace all sorts with just this field
   */
  const handleSort = (field: SortField, event?: React.MouseEvent) => {
    const params = new URLSearchParams(searchParams);
    const isShiftClick = event?.shiftKey;
    
    let newSortConfig: MultiSortConfig;
    
    if (isShiftClick) {
      // Shift+Click: Replace all with single sort on this field
      const existingSort = sortConfig.find(s => s.field === field);
      const direction = existingSort 
        ? (existingSort.direction === "asc" ? "desc" : "asc")
        : getDefaultDirection(field);
      newSortConfig = [{ field, direction }];
    } else {
      // Regular click: Check if field already in sort
      const existingIndex = sortConfig.findIndex(s => s.field === field);
      
      if (existingIndex >= 0) {
        // Field already in sort - toggle direction and promote to primary
        const currentSort = sortConfig[existingIndex];
        const newDirection = currentSort.direction === "asc" ? "desc" : "asc";
        const updatedSort: SortConfig = { ...currentSort, direction: newDirection };
        const withoutCurrent = sortConfig.filter((_, idx) => idx !== existingIndex);
        newSortConfig = [updatedSort, ...withoutCurrent];
      } else {
        // Field not in sort - add as primary and keep remaining priorities
        const nextSort: SortConfig = { field, direction: getDefaultDirection(field) };
        const trimmedExisting = sortConfig.slice(0, Math.max(0, MAX_SORT_LEVELS - 1));
        newSortConfig = [nextSort, ...trimmedExisting];
      }
    }
    
    // Update URL
    const sortParam = serializeMultiSort(newSortConfig);
    if (sortParam) {
      params.set("sort", sortParam);
    } else {
      params.delete("sort");
    }
    
    // Reset cursor when changing sort
    params.delete("cursor");
    
    // Update local state immediately for UI feedback
    setSortConfig(newSortConfig);
    
    // Clear local expenses to prevent flash of old data
    setExpenses([]);
    
    startTransition(() => {
      router.push(`/dashboard/expenses?${params.toString()}`);
    });
  };
  
  /**
   * Remove a specific sort level
   */
  const removeSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams);
    
    const newSortConfig = sortConfig.filter(s => s.field !== field);
    
    // Ensure we always have at least one sort (default to date desc)
    if (newSortConfig.length === 0) {
      newSortConfig.push({ field: "date", direction: "desc" });
    }
    
    // Update URL
    const sortParam = serializeMultiSort(newSortConfig);
    if (sortParam) {
      params.set("sort", sortParam);
    } else {
      params.delete("sort");
    }
    
    params.delete("cursor");
    
    setSortConfig(newSortConfig);
    setExpenses([]);
    
    startTransition(() => {
      router.push(`/dashboard/expenses?${params.toString()}`);
    });
  };
  
  /**
   * Clear all sorts and reset to default
   */
  const clearAllSorts = () => {
    const params = new URLSearchParams(searchParams);
    const defaultSort: MultiSortConfig = [{ field: "date", direction: "desc" }];
    
    params.delete("sort");
    params.delete("cursor");
    
    setSortConfig(defaultSort);
    setExpenses([]);
    
    startTransition(() => {
      router.push(`/dashboard/expenses?${params.toString()}`);
    });
  };
  
  /**
   * Get sort icon for column header
   * Shows priority number if field is in multi-sort
   */
  const getSortIcon = (field: SortField) => {
    const sortIndex = sortConfig.findIndex(s => s.field === field);
    
    if (sortIndex === -1) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
    }
    
    const sort = sortConfig[sortIndex];
    const isPrimary = sortIndex === 0;
    
    return (
      <div className="flex items-center gap-1">
        {sort.direction === "asc" 
          ? <ArrowUp className={`h-4 w-4 ${isPrimary ? "text-primary" : "text-muted-foreground"}`} />
          : <ArrowDown className={`h-4 w-4 ${isPrimary ? "text-primary" : "text-muted-foreground"}`} />
        }
        {sortConfig.length > 1 && (
          <span className={`text-xs ${isPrimary ? "text-primary font-medium" : "text-muted-foreground"}`}>
            {getSortPriorityLabel(sortIndex)}
          </span>
        )}
      </div>
    );
  };

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setSelectedCategories([]);
    setMinAmount("");
    setMaxAmount("");
    
    // Reset sort to default
    setSortConfig([{ field: "date", direction: "desc" }]);
    
    // Clear local expenses
    setExpenses([]);
    
    startTransition(() => {
      router.push("/dashboard/expenses");
    });
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const result = await bulkDeleteExpenses(Array.from(selectedIds));
    
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Deleted ${result.deletedCount} expenses`);
      setExpenses(expenses.filter((e) => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
      setIsDeleteDialogOpen(false);
    }
  };

  // Bulk update category
  const handleBulkUpdateCategory = async (categoryId: string) => {
    if (selectedIds.size === 0) return;

    const result = await bulkUpdateCategory(Array.from(selectedIds), categoryId);
    
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Updated ${result.updatedCount} expenses`);
      // Refresh the page to show updated categories
      router.refresh();
      setSelectedIds(new Set());
    }
  };

  // Export CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportExpensesCSV({
        dateFrom: fromDate ? new Date(fromDate) : null,
        dateTo: toDate ? new Date(toDate) : null,
        categoryIds: selectedCategories,
        amountMin: minAmount ? parseFloat(minAmount) : null,
        amountMax: maxAmount ? parseFloat(maxAmount) : null,
        search,
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        // Download CSV
        const blob = new Blob([result.csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename || `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("CSV exported successfully");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const normalizeExpenseItem = (item: ServerExpenseItem): Expense => {
    const normalizedAmount = typeof item.amount === "number"
      ? item.amount
      : Number.parseFloat(item.amount);

    return {
      ...item,
      amount: Number.isNaN(normalizedAmount) ? 0 : normalizedAmount,
      date: item.date instanceof Date ? item.date : new Date(item.date),
    };
  };

  // Load more - appends to existing list
  const loadMore = async (): Promise<void> => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const result = await getExpensesWithFilters(
        {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          categoryIds: filters.categoryIds,
          amountMin: filters.amountMin,
          amountMax: filters.amountMax,
          search: filters.search,
          sort: sortConfig,
        },
        { cursor: nextCursor }
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const normalizedItems = result.items.map((item) =>
        normalizeExpenseItem(item as ServerExpenseItem)
      );

      setExpenses((previous) => {
        const existingIds = new Set(previous.map((expense) => expense.id));
        const deduped = normalizedItems.filter((expense) => !existingIds.has(expense.id));
        if (deduped.length === 0) {
          return previous;
        }
        return [...previous, ...deduped];
      });
      setNextCursor(result.pageInfo.endCursor);
    } catch {
      toast.error("Failed to load more expenses");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const hasFilters = search || fromDate || toDate || selectedCategories.length > 0 || minAmount || maxAmount;
  const hasSelection = selectedIds.size > 0;
  const hasCustomSort = sortConfig.length > 1 || sortConfig[0]?.field !== "date" || sortConfig[0]?.direction !== "desc";
  const selectedCategoryNames = categories
    .filter((category) => selectedCategories.includes(category.id))
    .map((category) => category.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Manage and analyze your expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || expenses.length === 0}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
                <DialogDescription>
                  Create a new expense entry
                </DialogDescription>
              </DialogHeader>
              <ExpenseForm
                userId={currentUserId}
                companyId={companyId}
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  router.refresh();
                  toast.success("Expense added successfully");
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.count} expense{summary.count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {hasFilters && (
          <Card>
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
              <p className="text-xs text-muted-foreground">
                Click clear to reset
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Multi-Column Sort Display */}
      {hasCustomSort && (
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">Sort by:</span>
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
                  <span className="text-xs opacity-70 ml-0.5">
                    {getSortPriorityLabel(index)}
                  </span>
                  <button
                    onClick={() => removeSort(sort.field)}
                    className="ml-1 hover:text-destructive focus:outline-none"
                    aria-label={`Remove ${getSortFieldLabel(sort.field)} sort`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllSorts}
                className="h-7 px-2 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Clicking a column makes it primary sort (up to {MAX_SORT_LEVELS} levels). Shift+click to sort by a single column.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {selectedIds.size} expense{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select onValueChange={handleBulkUpdateCategory}>
              <SelectTrigger className="w-[180px]">
                <Tag className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Change Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Expenses</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete {selectedIds.size} expense
                    {selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleBulkDelete}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
              <Button size="sm" onClick={applyFilters} disabled={isPending}>
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
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categories</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                >
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
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No categories available
                  </div>
                ) : (
                  categories.map((category) => {
                    const checked = selectedCategories.includes(category.id);
                    return (
                      <DropdownMenuCheckboxItem
                        key={category.id}
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleCategoryFilter(category.id, value === true)
                        }
                        onSelect={(event) => event.preventDefault()}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
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
                      onClick={() => setSelectedCategories([])}
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Clear categories
                    </button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Min Amount</label>
            <Input
              type="number"
              placeholder="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Amount</label>
            <Input
              type="number"
              placeholder="∞"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={expenses.length > 0 && selectedIds.size === expenses.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={(e) => handleSort("date", e as unknown as React.MouseEvent)}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {getSortIcon("date")}
                  </div>
                </TableHead>
                <TableHead>
                  Description
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={(e) => handleSort("category", e as unknown as React.MouseEvent)}
                >
                  <div className="flex items-center gap-1">
                    Category
                    {getSortIcon("category")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={(e) => handleSort("user", e as unknown as React.MouseEvent)}
                >
                  <div className="flex items-center gap-1">
                    User
                    {getSortIcon("user")}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={(e) => handleSort("amount", e as unknown as React.MouseEvent)}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    {getSortIcon("amount")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Calendar className="h-8 w-8 mb-2" />
                      <p>No expenses found</p>
                      {hasFilters && (
                        <p className="text-sm">Try adjusting your filters</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(expense.id)}
                        onCheckedChange={() => toggleSelect(expense.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.description}
                    </TableCell>
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
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
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

          {/* Pagination */}
          {(nextCursor || isLoadingMore) && (
            <div className="flex items-center justify-center p-4 border-t">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore || !nextCursor}
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
    </div>
  );
}
