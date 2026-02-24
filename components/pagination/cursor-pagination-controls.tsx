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
