"use client";

import { serializeMultiSort, type MultiSortConfig } from "@/lib/expense-sorting";
import type { Category } from "./expenses-client-types";

export interface ExpenseFilterDraft {
  search: string;
  fromDate: string;
  toDate: string;
  selectedCategories: string[];
  minAmount: string;
  maxAmount: string;
}

export function buildFilterSearchParams(
  searchParams: URLSearchParams,
  draft: ExpenseFilterDraft
): URLSearchParams {
  const params = new URLSearchParams(searchParams);

  if (draft.search) params.set("search", draft.search);
  else params.delete("search");

  if (draft.fromDate) params.set("from", draft.fromDate);
  else params.delete("from");

  if (draft.toDate) params.set("to", draft.toDate);
  else params.delete("to");

  if (draft.selectedCategories.length > 0) {
    params.set("category", draft.selectedCategories.join(","));
  } else {
    params.delete("category");
  }

  if (draft.minAmount) params.set("minAmount", draft.minAmount);
  else params.delete("minAmount");

  if (draft.maxAmount) params.set("maxAmount", draft.maxAmount);
  else params.delete("maxAmount");

  params.delete("cursor");

  return params;
}

export function buildSortSearchParams(
  searchParams: URLSearchParams,
  sortConfig: MultiSortConfig
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  const sortParam = serializeMultiSort(sortConfig);

  if (sortParam) {
    params.set("sort", sortParam);
  } else {
    params.delete("sort");
  }

  params.delete("cursor");
  return params;
}

export function hasCustomSortConfig(sortConfig: MultiSortConfig): boolean {
  return (
    sortConfig.length > 1 ||
    sortConfig[0]?.field !== "date" ||
    sortConfig[0]?.direction !== "desc"
  );
}

export function getSelectedCategoryNames(
  categories: Category[],
  selectedCategories: string[]
): string[] {
  return categories
    .filter((category) => selectedCategories.includes(category.id))
    .map((category) => category.name);
}
