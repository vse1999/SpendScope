/**
 * Cursor Pagination Controls Component
 * Provides Previous/Next navigation for cursor-based pagination
 */

"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CursorPaginationControlsProps {
  /** Callback when previous button is clicked */
  onPrevious: () => void | Promise<void>;
  /** Callback when next button is clicked */
  onNext: () => void | Promise<void>;
  /** Whether there is a previous page available */
  hasPrevious: boolean;
  /** Whether there is a next page available */
  hasNext: boolean;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Optional display text for current page info */
  pageInfoText?: string;
  /** Optional additional className */
  className?: string;
  /** Optional size variant */
  size?: "sm" | "md" | "lg";
  /** Optional alignment */
  align?: "start" | "center" | "end";
  /** Optional variant style */
  variant?: "default" | "minimal" | "outline";
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_MAP = {
  sm: {
    button: "h-7 px-2 text-xs" as const,
    icon: "size-3" as const,
  },
  md: {
    button: "h-9 px-4" as const,
    icon: "size-4" as const,
  },
  lg: {
    button: "h-11 px-6" as const,
    icon: "size-5" as const,
  },
};

const ALIGN_MAP = {
  start: "justify-start" as const,
  center: "justify-center" as const,
  end: "justify-end" as const,
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Pagination controls for cursor-based navigation
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CursorPaginationControls
 *   onPrevious={pagination.loadPreviousPage}
 *   onNext={pagination.loadNextPage}
 *   hasPrevious={pagination.canGoPrevious}
 *   hasNext={pagination.canGoNext}
 *   isLoading={pagination.isLoading}
 * />
 *
 * // With page info
 * <CursorPaginationControls
 *   onPrevious={pagination.loadPreviousPage}
 *   onNext={pagination.loadNextPage}
 *   hasPrevious={pagination.canGoPrevious}
 *   hasNext={pagination.canGoNext}
 *   isLoading={pagination.isLoading}
 *   pageInfoText={`${pagination.items.length} items`}
 *   align="center"
 * />
 * ```
 */
export function CursorPaginationControls({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isLoading = false,
  pageInfoText,
  className,
  size = "md",
  align = "center",
  variant = "default",
}: CursorPaginationControlsProps): React.ReactElement {
  const sizeClasses = SIZE_MAP[size];
  const alignClass = ALIGN_MAP[align];

  const handlePrevious = (): void => {
    if (!isLoading && hasPrevious) {
      void onPrevious();
    }
  };

  const handleNext = (): void => {
    if (!isLoading && hasNext) {
      void onNext();
    }
  };

  const buttonVariant =
    variant === "outline"
      ? "outline"
      : variant === "minimal"
        ? "ghost"
        : "default";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        alignClass,
        className,
      )}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <Button
        variant={buttonVariant}
        size="sm"
        className={cn(
          sizeClasses.button,
          "flex items-center gap-1",
          !hasPrevious && "opacity-50 cursor-not-allowed",
        )}
        onClick={handlePrevious}
        disabled={!hasPrevious || isLoading}
        aria-label="Go to previous page"
        aria-disabled={!hasPrevious || isLoading}
      >
        {isLoading ? (
          <Loader2 className={cn(sizeClasses.icon, "animate-spin")} />
        ) : (
          <ChevronLeft className={sizeClasses.icon} />
        )}
        <span>Previous</span>
      </Button>

      {/* Page Info */}
      {pageInfoText && (
        <span
          className={cn(
            "text-muted-foreground px-2",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base",
          )}
          aria-live="polite"
        >
          {pageInfoText}
        </span>
      )}

      {/* Next Button */}
      <Button
        variant={buttonVariant}
        size="sm"
        className={cn(
          sizeClasses.button,
          "flex items-center gap-1",
          !hasNext && "opacity-50 cursor-not-allowed",
        )}
        onClick={handleNext}
        disabled={!hasNext || isLoading}
        aria-label="Go to next page"
        aria-disabled={!hasNext || isLoading}
      >
        <span>Next</span>
        {isLoading ? (
          <Loader2 className={cn(sizeClasses.icon, "animate-spin")} />
        ) : (
          <ChevronRight className={sizeClasses.icon} />
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export interface CompactCursorPaginationProps {
  /** Callback when previous button is clicked */
  onPrevious: () => void | Promise<void>;
  /** Callback when next button is clicked */
  onNext: () => void | Promise<void>;
  /** Whether there is a previous page available */
  hasPrevious: boolean;
  /** Whether there is a next page available */
  hasNext: boolean;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Optional additional className */
  className?: string;
}

/**
 * Compact pagination controls with icon-only buttons
 * Ideal for tight spaces or mobile views
 */
export function CompactCursorPagination({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isLoading = false,
  className,
}: CompactCursorPaginationProps): React.ReactElement {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="navigation"
      aria-label="Pagination"
    >
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => {
          if (!isLoading && hasPrevious) {
            void onPrevious();
          }
        }}
        disabled={!hasPrevious || isLoading}
        aria-label="Previous page"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ChevronLeft className="size-4" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => {
          if (!isLoading && hasNext) {
            void onNext();
          }
        }}
        disabled={!hasNext || isLoading}
        aria-label="Next page"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// PAGE INFO COMPONENT
// ============================================================================

export interface PageInfoDisplayProps {
  /** Current page start item number */
  startItem: number;
  /** Current page end item number */
  endItem: number;
  /** Total number of items (if known) */
  totalItems?: number;
  /** Whether total count is being loaded */
  isLoadingTotal?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Displays current page range information
 */
export function PageInfoDisplay({
  startItem,
  endItem,
  totalItems,
  isLoadingTotal = false,
  className,
}: PageInfoDisplayProps): React.ReactElement {
  const hasTotal = totalItems !== undefined && !isLoadingTotal;

  return (
    <span
      className={cn("text-sm text-muted-foreground", className)}
      aria-live="polite"
    >
      Showing {startItem}–{endItem}
      {hasTotal && ` of ${totalItems}`}
      {isLoadingTotal && " of ..."}
    </span>
  );
}

// ============================================================================
// COMBINED COMPONENT
// ============================================================================

export interface FullPaginationProps extends CursorPaginationControlsProps {
  /** Current page start item number */
  startItem?: number;
  /** Current page end item number */
  endItem?: number;
  /** Total number of items (if known) */
  totalItems?: number;
}

/**
 * Full pagination component with controls and page info
 */
export function FullPagination({
  startItem,
  endItem,
  totalItems,
  ...controlsProps
}: FullPaginationProps): React.ReactElement {
  const showInfo =
    startItem !== undefined &&
    endItem !== undefined &&
    (totalItems === undefined || totalItems > 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {showInfo && (
        <PageInfoDisplay
          startItem={startItem}
          endItem={endItem}
          totalItems={totalItems}
        />
      )}
      <CursorPaginationControls {...controlsProps} />
    </div>
  );
}
