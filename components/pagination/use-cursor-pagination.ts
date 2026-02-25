/**
 * React hook for client-side cursor-based pagination
 * Provides state management and navigation functions
 */

"use client";

import { useCallback, useState, useTransition } from "react";

import type { CursorDirection, PaginatedResult } from "@/lib/pagination/cursor-pagination";

// ============================================================================
// TYPES
// ============================================================================

export interface UseCursorPaginationOptions<T> {
  /** Initial data for the first page */
  initialData: PaginatedResult<T>;
  /** Function to fetch data for a given cursor and direction */
  fetchData: (params: {
    cursor: string | null;
    direction: CursorDirection;
  }) => Promise<PaginatedResult<T>>;
  /** Optional callback when data changes */
  onDataChange?: (data: PaginatedResult<T>) => void;
}

export interface UseCursorPaginationReturn<T> {
  /** Current page items */
  items: T[];
  /** Pagination metadata */
  pageInfo: PaginatedResult<T>["pageInfo"];
  /** Loading state for transitions */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Load the next page (older items) */
  loadNextPage: () => Promise<void>;
  /** Load the previous page (newer items) */
  loadPreviousPage: () => Promise<void>;
  /** Refresh current page */
  refresh: () => Promise<void>;
  /** Check if can navigate forward */
  canGoNext: boolean;
  /** Check if can navigate backward */
  canGoPrevious: boolean;
  /** Current direction for tracking */
  currentDirection: CursorDirection;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * React hook for managing cursor-based pagination state
 *
 * @example
 * ```tsx
 * const pagination = useCursorPagination({
 *   initialData,
 *   fetchData: async ({ cursor, direction }) => {
 *     const response = await fetch(`/api/items?cursor=${cursor}&direction=${direction}`);
 *     return response.json();
 *   },
 * });
 *
 * return (
 *   <div>
 *     <ItemList items={pagination.items} />
 *     <CursorPaginationControls
 *       onPrevious={pagination.loadPreviousPage}
 *       onNext={pagination.loadNextPage}
 *       hasPrevious={pagination.canGoPrevious}
 *       hasNext={pagination.canGoNext}
 *       isLoading={pagination.isLoading}
 *     />
 *   </div>
 * );
 * ```
 */
export function useCursorPagination<T>(
  options: UseCursorPaginationOptions<T>,
): UseCursorPaginationReturn<T> {
  const { initialData, fetchData, onDataChange } = options;

  // Core state
  const [data, setData] = useState<PaginatedResult<T>>(initialData);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [currentDirection, setCurrentDirection] = useState<CursorDirection>("forward");
  const [error, setError] = useState<Error | null>(null);

  // Use transition for smoother UI updates
  const [isPending, startTransition] = useTransition();

  /**
   * Updates data and triggers callback if provided
   */
  const updateData = useCallback(
    (newData: PaginatedResult<T>) => {
      setData(newData);
      onDataChange?.(newData);
    },
    [onDataChange],
  );

  /**
   * Loads the next page (older items when sorted by createdAt desc)
   */
  const loadNextPage = useCallback(async (): Promise<void> => {
    if (!data.pageInfo.hasNextPage || isPending) {
      return;
    }

    setError(null);
    const nextCursor = data.pageInfo.endCursor;

    startTransition(async () => {
      try {
        setCurrentCursor(nextCursor);
        setCurrentDirection("forward");

        const result = await fetchData({
          cursor: nextCursor,
          direction: "forward",
        });

        updateData(result);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to load next page");
        setError(error);
        // Revert cursor on error
        setCurrentCursor(null);
      }
    });
  }, [data.pageInfo.hasNextPage, data.pageInfo.endCursor, fetchData, isPending, updateData]);

  /**
   * Loads the previous page (newer items when sorted by createdAt desc)
   */
  const loadPreviousPage = useCallback(async (): Promise<void> => {
    if (!data.pageInfo.hasPreviousPage || isPending) {
      return;
    }

    setError(null);
    const prevCursor = data.pageInfo.startCursor;

    startTransition(async () => {
      try {
        setCurrentCursor(prevCursor);
        setCurrentDirection("backward");

        const result = await fetchData({
          cursor: prevCursor,
          direction: "backward",
        });

        updateData(result);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to load previous page");
        setError(error);
        // Revert cursor on error
        setCurrentCursor(null);
      }
    });
  }, [
    data.pageInfo.hasPreviousPage,
    data.pageInfo.startCursor,
    fetchData,
    isPending,
    updateData,
  ]);

  /**
   * Refreshes the current page
   * Useful for re-fetching after mutations
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (isPending) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await fetchData({
          cursor: currentCursor,
          direction: currentDirection,
        });

        updateData(result);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to refresh data");
        setError(error);
      }
    });
  }, [currentCursor, currentDirection, fetchData, isPending, updateData]);

  return {
    items: data.items,
    pageInfo: data.pageInfo,
    isLoading: isPending,
    error,
    loadNextPage,
    loadPreviousPage,
    refresh,
    canGoNext: data.pageInfo.hasNextPage,
    canGoPrevious: data.pageInfo.hasPreviousPage,
    currentDirection,
  };
}
