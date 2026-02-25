"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  bulkDeleteExpenses,
  bulkUpdateCategory,
  exportExpensesCSV,
  getExpensesWithFilters,
} from "@/app/actions/expenses";
import {
  MAX_SORT_LEVELS,
  getDefaultDirection,
  type MultiSortConfig,
  type SortConfig,
} from "@/lib/expense-sorting";
import { normalizeExpenseItem } from "./expenses-client-helpers";
import {
  buildFilterSearchParams,
  buildSortSearchParams,
  getSelectedCategoryNames,
  hasCustomSortConfig,
  type ExpenseFilterDraft,
} from "./use-expenses-list-state-helpers";
import type { UpgradeDialogContext } from "@/components/entitlements";
import type {
  Category,
  Expense,
  ExpensesClientProps,
  ServerExpenseItem,
  SortField,
} from "./expenses-client-types";

interface UseExpensesListStateArgs {
  initialExpenses: Expense[];
  initialNextCursor: string | null;
  filters: ExpensesClientProps["filters"];
  initialSortConfig: MultiSortConfig;
  categories: Category[];
  onUpgradeRequired?: (context: UpgradeDialogContext) => void;
}

interface UseExpensesListStateResult {
  router: ReturnType<typeof useRouter>;
  isPending: boolean;
  expenses: Expense[];
  nextCursor: string | null;
  isLoadingMore: boolean;
  selectedIds: Set<string>;
  isDeleteDialogOpen: boolean;
  isExporting: boolean;
  search: string;
  fromDate: string;
  toDate: string;
  selectedCategories: string[];
  minAmount: string;
  maxAmount: string;
  sortConfig: MultiSortConfig;
  hasFilters: boolean;
  hasSelection: boolean;
  hasCustomSort: boolean;
  selectedCategoryNames: string[];
  setIsDeleteDialogOpen: (open: boolean) => void;
  setSelectedIds: (ids: Set<string>) => void;
  setSearch: (value: string) => void;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  setMinAmount: (value: string) => void;
  setMaxAmount: (value: string) => void;
  setSelectedCategories: (value: string[]) => void;
  toggleSelectAll: () => void;
  toggleSelect: (id: string) => void;
  toggleCategoryFilter: (categoryId: string, checked: boolean) => void;
  applyFilters: () => void;
  handleSort: (field: SortField, event?: React.MouseEvent) => void;
  removeSort: (field: SortField) => void;
  clearAllSorts: () => void;
  clearFilters: () => void;
  handleBulkDelete: () => Promise<void>;
  handleBulkUpdateCategory: (categoryId: string) => Promise<void>;
  handleExport: () => Promise<void>;
  loadMore: () => Promise<void>;
}

function getNextSortConfig(
  current: MultiSortConfig,
  field: SortField,
  isShiftClick: boolean
): MultiSortConfig {
  if (!isShiftClick) {
    const existing = current.find((sort) => sort.field === field);
    const direction = existing ? (existing.direction === "asc" ? "desc" : "asc") : getDefaultDirection(field);
    return [{ field, direction }];
  }

  const existingIndex = current.findIndex((sort) => sort.field === field);
  if (existingIndex >= 0) {
    const updated = [...current];
    const currentSort = updated[existingIndex];
    updated[existingIndex] = {
      ...currentSort,
      direction: currentSort.direction === "asc" ? "desc" : "asc",
    };
    return updated;
  }

  const nextSort: SortConfig = { field, direction: getDefaultDirection(field) };
  return [...current, nextSort].slice(0, MAX_SORT_LEVELS);
}

export function useExpensesListState({
  initialExpenses,
  initialNextCursor,
  filters,
  initialSortConfig,
  categories,
  onUpgradeRequired,
}: UseExpensesListStateArgs): UseExpensesListStateResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [search, setSearch] = useState<string>(filters.search || "");
  const [fromDate, setFromDate] = useState<string>(filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "");
  const [toDate, setToDate] = useState<string>(filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(filters.categoryIds || []);
  const [minAmount, setMinAmount] = useState<string>(filters.amountMin?.toString() || "");
  const [maxAmount, setMaxAmount] = useState<string>(filters.amountMax?.toString() || "");
  const [sortConfig, setSortConfig] = useState<MultiSortConfig>(initialSortConfig);

  useEffect(() => {
    setExpenses(initialExpenses);
    setNextCursor(initialNextCursor);
    setIsLoadingMore(false);
  }, [initialExpenses, initialNextCursor]);

  useEffect(() => {
    setSearch(filters.search || "");
    setFromDate(filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : "");
    setToDate(filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : "");
    setSelectedCategories(filters.categoryIds || []);
    setMinAmount(filters.amountMin?.toString() || "");
    setMaxAmount(filters.amountMax?.toString() || "");

    if (filters.sort) {
      setSortConfig(filters.sort);
    }
  }, [filters]);

  const toggleSelectAll = (): void => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(expenses.map((expense) => expense.id)));
  };

  const toggleSelect = (id: string): void => {
    const nextSelection = new Set(selectedIds);
    if (nextSelection.has(id)) {
      nextSelection.delete(id);
    } else {
      nextSelection.add(id);
    }
    setSelectedIds(nextSelection);
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

  const applyFilters = (): void => {
    const filterDraft: ExpenseFilterDraft = {
      search,
      fromDate,
      toDate,
      selectedCategories,
      minAmount,
      maxAmount,
    };
    const params = buildFilterSearchParams(new URLSearchParams(searchParams), filterDraft);

    startTransition(() => {
      router.replace(`/dashboard/expenses?${params.toString()}`, { scroll: false });
    });
  };

  const handleSort = (field: SortField, event?: React.MouseEvent): void => {
    const newSortConfig = getNextSortConfig(sortConfig, field, Boolean(event?.shiftKey));
    const params = buildSortSearchParams(new URLSearchParams(searchParams), newSortConfig);
    setSortConfig(newSortConfig);

    startTransition(() => {
      router.replace(`/dashboard/expenses?${params.toString()}`, { scroll: false });
    });
  };

  const removeSort = (field: SortField): void => {
    const newSortConfig = sortConfig.filter((sort) => sort.field !== field);

    if (newSortConfig.length === 0) {
      newSortConfig.push({ field: "date", direction: "desc" });
    }

    const params = buildSortSearchParams(new URLSearchParams(searchParams), newSortConfig);

    setSortConfig(newSortConfig);

    startTransition(() => {
      router.replace(`/dashboard/expenses?${params.toString()}`, { scroll: false });
    });
  };

  const clearAllSorts = (): void => {
    const params = new URLSearchParams(searchParams);
    const defaultSort: MultiSortConfig = [{ field: "date", direction: "desc" }];

    params.delete("sort");
    params.delete("cursor");
    setSortConfig(defaultSort);

    startTransition(() => {
      router.replace(`/dashboard/expenses?${params.toString()}`, { scroll: false });
    });
  };

  const clearFilters = (): void => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setSelectedCategories([]);
    setMinAmount("");
    setMaxAmount("");
    setSortConfig([{ field: "date", direction: "desc" }]);

    startTransition(() => {
      router.replace("/dashboard/expenses", { scroll: false });
    });
  };

  const handleBulkDelete = async (): Promise<void> => {
    if (selectedIds.size === 0) {
      return;
    }

    const result = await bulkDeleteExpenses(Array.from(selectedIds));

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(`Deleted ${result.deletedCount} expenses`);
    setExpenses(expenses.filter((expense) => !selectedIds.has(expense.id)));
    setSelectedIds(new Set());
    setIsDeleteDialogOpen(false);
  };

  const handleBulkUpdateCategory = async (categoryId: string): Promise<void> => {
    if (selectedIds.size === 0) {
      return;
    }

    const result = await bulkUpdateCategory(Array.from(selectedIds), categoryId);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(`Updated ${result.updatedCount} expenses`);
    router.refresh();
    setSelectedIds(new Set());
  };

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const result = await exportExpensesCSV({
        dateFrom: fromDate ? new Date(fromDate) : null,
        dateTo: toDate ? new Date(toDate) : null,
        categoryIds: selectedCategories,
        amountMin: minAmount ? Number.parseFloat(minAmount) : null,
        amountMax: maxAmount ? Number.parseFloat(maxAmount) : null,
        search,
      });

      if ("error" in result) {
        if (result.code === "FORBIDDEN_FEATURE") {
          onUpgradeRequired?.({
            feature: "csvExport",
            source: "expenses_export",
            reason: result.error,
          });
          return;
        }
        toast.error(result.error);
        return;
      }

      const blob = new Blob([result.csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename || `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } finally {
      setIsExporting(false);
    }
  };

  const loadMore = async (): Promise<void> => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

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

      const normalizedItems = result.items.map((item) => normalizeExpenseItem(item as ServerExpenseItem));

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

  const hasFilters =
    Boolean(search) ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    selectedCategories.length > 0 ||
    Boolean(minAmount) ||
    Boolean(maxAmount);
  const hasSelection = selectedIds.size > 0;
  const hasCustomSort = hasCustomSortConfig(sortConfig);
  const selectedCategoryNames = getSelectedCategoryNames(categories, selectedCategories);

  return {
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
  };
}
