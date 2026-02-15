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
  serializeMultiSort,
  type MultiSortConfig,
  type SortConfig,
} from "@/lib/expense-sorting";
import { normalizeExpenseItem } from "./expenses-client-helpers";
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

export function useExpensesListState({
  initialExpenses,
  initialNextCursor,
  filters,
  initialSortConfig,
  categories,
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
    const params = new URLSearchParams(searchParams);

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

    params.delete("cursor");
    setExpenses([]);

    startTransition(() => {
      router.push(`/dashboard/expenses?${params.toString()}`);
    });
  };

  const handleSort = (field: SortField, event?: React.MouseEvent): void => {
    const params = new URLSearchParams(searchParams);
    const isShiftClick = event?.shiftKey;

    let newSortConfig: MultiSortConfig;

    if (isShiftClick) {
      const existingSort = sortConfig.find((sort) => sort.field === field);
      const direction = existingSort
        ? existingSort.direction === "asc"
          ? "desc"
          : "asc"
        : getDefaultDirection(field);
      newSortConfig = [{ field, direction }];
    } else {
      const existingIndex = sortConfig.findIndex((sort) => sort.field === field);

      if (existingIndex >= 0) {
        const currentSort = sortConfig[existingIndex];
        const newDirection = currentSort.direction === "asc" ? "desc" : "asc";
        const updatedSort: SortConfig = { ...currentSort, direction: newDirection };
        const withoutCurrent = sortConfig.filter((_, index) => index !== existingIndex);
        newSortConfig = [updatedSort, ...withoutCurrent];
      } else {
        const nextSort: SortConfig = { field, direction: getDefaultDirection(field) };
        const trimmedExisting = sortConfig.slice(0, Math.max(0, MAX_SORT_LEVELS - 1));
        newSortConfig = [nextSort, ...trimmedExisting];
      }
    }

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

  const removeSort = (field: SortField): void => {
    const params = new URLSearchParams(searchParams);
    const newSortConfig = sortConfig.filter((sort) => sort.field !== field);

    if (newSortConfig.length === 0) {
      newSortConfig.push({ field: "date", direction: "desc" });
    }

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

  const clearAllSorts = (): void => {
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

  const clearFilters = (): void => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setSelectedCategories([]);
    setMinAmount("");
    setMaxAmount("");
    setSortConfig([{ field: "date", direction: "desc" }]);
    setExpenses([]);

    startTransition(() => {
      router.push("/dashboard/expenses");
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
  const hasCustomSort =
    sortConfig.length > 1 || sortConfig[0]?.field !== "date" || sortConfig[0]?.direction !== "desc";
  const selectedCategoryNames = categories
    .filter((category) => selectedCategories.includes(category.id))
    .map((category) => category.name);

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
