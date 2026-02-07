"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { 
  Search, 
  Download, 
  Trash2, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Plus,
  Calendar,
  Tag,
  DollarSign,
  CheckSquare,
  Square,
  Loader2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ExpenseForm from "@/components/expense-form";
import { bulkDeleteExpenses, bulkUpdateCategory, exportExpensesCSV } from "@/app/actions/expenses";

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
  };
  isAdmin: boolean;
  currentUserId: string;
  companyId: string;
}

export function ExpensesClient({
  initialExpenses,
  initialNextCursor,
  categories,
  summary,
  filters,
  isAdmin,
  currentUserId,
  companyId,
}: ExpensesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // State
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [search, setSearch] = useState(filters.search || "");
  const [fromDate, setFromDate] = useState(filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "");
  const [toDate, setToDate] = useState(filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(filters.categoryIds || []);
  const [minAmount, setMinAmount] = useState(filters.amountMin?.toString() || "");
  const [maxAmount, setMaxAmount] = useState(filters.amountMax?.toString() || "");

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

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (selectedCategories.length > 0) params.set("category", selectedCategories.join(","));
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);
    
    startTransition(() => {
      router.push(`/dashboard/expenses?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setSelectedCategories([]);
    setMinAmount("");
    setMaxAmount("");
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

  // Load more
  const loadMore = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams);
    params.set("cursor", nextCursor);
    startTransition(() => {
      router.push(`/dashboard/expenses?${params.toString()}`);
    });
  };

  const hasFilters = search || fromDate || toDate || selectedCategories.length > 0 || minAmount || maxAmount;
  const hasSelection = selectedIds.size > 0;

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
            <Select
              value={selectedCategories.join(",")}
              onValueChange={(value) => setSelectedCategories(value ? value.split(",") : [])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select categories..." />
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
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Min Amount</label>
            <Input
              type="number"
              placeholder="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Amount</label>
            <Input
              type="number"
              placeholder="∞"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
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
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Amount</TableHead>
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
          {nextCursor && (
            <div className="flex items-center justify-center p-4 border-t">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ChevronLeft className="mr-2 h-4 w-4" />
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
