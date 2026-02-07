/**
 * Cursor-based pagination service for SpendScope
 * Provides opaque cursor encoding/decoding and pagination utilities
 */

import { z } from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 1;

// ============================================================================
// TYPES
// ============================================================================

export type CursorDirection = "forward" | "backward";

export interface CursorPaginationParams {
  cursor?: string | null;
  limit: number;
  direction?: CursorDirection;
}

export interface PaginatedResult<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
    totalCount?: number;
  };
}

/**
 * Internal cursor data structure - opaque to clients
 * @internal
 */
export interface CursorData {
  v: "v1"; // Version for future migrations
  id: string; // Unique record identifier
  d: string; // ISO date string for sorting
}

/**
 * Item that can be paginated with cursor
 */
export interface CursorPaginableItem {
  id: string;
  createdAt: Date;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

const cursorDataSchema = z.object({
  v: z.literal("v1"),
  id: z.string().min(1),
  d: z.string().datetime(),
});

// ============================================================================
// CURSOR ENCODING/DECODING
// ============================================================================

/**
 * Encodes cursor data to an opaque base64url string
 * @param data - The cursor data to encode
 * @returns Base64url encoded cursor string
 */
export function encodeCursor(data: CursorData): string {
  const jsonString = JSON.stringify(data);
  // Use base64url encoding (URL-safe, no padding)
  const base64 = Buffer.from(jsonString)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return base64;
}

/**
 * Decodes and validates a cursor string
 * @param cursor - The encoded cursor string
 * @returns Parsed CursorData or null if invalid
 */
export function decodeCursor(cursor: string | null | undefined): CursorData | null {
  if (!cursor) return null;

  try {
    // Restore padding if needed
    const padding = "=".repeat((4 - (cursor.length % 4)) % 4);
    const base64 = cursor.replace(/-/g, "+").replace(/_/g, "/") + padding;

    const jsonString = Buffer.from(base64, "base64").toString("utf-8");
    const parsed: unknown = JSON.parse(jsonString);

    // Validate cursor structure
    const result = cursorDataSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }

    return result.data;
  } catch {
    // Invalid base64 or JSON
    return null;
  }
}

// ============================================================================
// CURSOR CREATION
// ============================================================================

/**
 * Creates a cursor from a paginable item
 * @param item - The item to create a cursor for
 * @returns Encoded cursor string
 */
export function createCursor(item: CursorPaginableItem): string {
  const cursorData: CursorData = {
    v: "v1",
    id: item.id,
    d: item.createdAt.toISOString(),
  };
  return encodeCursor(cursorData);
}

// ============================================================================
// PAGINATION VALIDATION
// ============================================================================

/**
 * Validates and normalizes pagination parameters
 * @param params - Raw pagination parameters
 * @returns Normalized parameters with safe defaults
 */
export function validatePaginationParams(
  params: Partial<CursorPaginationParams>,
): CursorPaginationParams {
  let limit = params.limit ?? DEFAULT_PAGE_SIZE;

  // Enforce bounds
  if (limit < MIN_PAGE_SIZE) {
    limit = MIN_PAGE_SIZE;
  } else if (limit > MAX_PAGE_SIZE) {
    limit = MAX_PAGE_SIZE;
  }

  return {
    cursor: params.cursor ?? null,
    limit,
    direction: params.direction ?? "forward",
  };
}

// ============================================================================
// CORE PAGINATION FUNCTION
// ============================================================================

/**
 * Paginates a dataset using cursor-based pagination
 * @param items - The complete dataset to paginate
 * @param params - Pagination parameters
 * @returns Paginated result with page info
 */
export function paginateWithCursor<T extends CursorPaginableItem>(
  items: T[],
  params: CursorPaginationParams,
): PaginatedResult<T> {
  const { cursor, limit, direction } = validatePaginationParams(params);
  const decodedCursor = decodeCursor(cursor);

  // Empty dataset edge case
  if (items.length === 0) {
    return {
      items: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
        totalCount: 0,
      },
    };
  }

  // Sort items by createdAt desc, then by id for stable ordering
  const sortedItems = [...items].sort((a, b) => {
    const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.id.localeCompare(b.id);
  });

  let startIndex = 0;

  // Find starting position based on cursor
  if (decodedCursor) {
    const cursorDate = new Date(decodedCursor.d);
    startIndex = sortedItems.findIndex((item) => {
      const itemDate = item.createdAt.getTime();
      const cursorTime = cursorDate.getTime();

      if (direction === "forward") {
        // For forward pagination, find items BEFORE the cursor (older)
        return itemDate < cursorTime || (itemDate === cursorTime && item.id < decodedCursor.id);
      } else {
        // For backward pagination, find items AFTER the cursor (newer)
        return itemDate > cursorTime || (itemDate === cursorTime && item.id > decodedCursor.id);
      }
    });

    if (startIndex === -1) {
      // Cursor not found, start from beginning
      startIndex = 0;
    }
  }

  // Calculate slice bounds
  const endIndex = startIndex + limit;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  // Determine page info
  const hasNextPage = endIndex < sortedItems.length;
  const hasPreviousPage = startIndex > 0 || (decodedCursor !== null && direction === "backward");

  // Generate cursors for the current page
  const startCursor = paginatedItems.length > 0 ? createCursor(paginatedItems[0]) : null;
  const endCursor =
    paginatedItems.length > 0 ? createCursor(paginatedItems[paginatedItems.length - 1]) : null;

  return {
    items: paginatedItems,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
      totalCount: sortedItems.length,
    },
  };
}

// ============================================================================
// OFFSET-BASED FALLBACK
// ============================================================================

export interface OffsetPaginationParams {
  page: number;
  pageSize: number;
}

export interface OffsetPaginatedResult<T> {
  items: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Fallback pagination using offset/limit for small datasets
 * Useful when cursor pagination is overkill (e.g., < 1000 items)
 * @param items - The complete dataset to paginate
 * @param params - Offset pagination parameters
 * @returns Paginated result with offset-based pagination info
 */
export function paginateWithOffset<T>(
  items: T[],
  params: OffsetPaginationParams,
): OffsetPaginatedResult<T> {
  let { page, pageSize } = params;

  // Validate and normalize
  page = Math.max(1, page);
  pageSize = Math.max(MIN_PAGE_SIZE, Math.min(pageSize, MAX_PAGE_SIZE));

  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = Math.min(page, Math.max(1, totalPages));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
}

// ============================================================================
// DATABASE QUERY HELPERS (for Prisma)
// ============================================================================

/**
 * Builds Prisma where clause for cursor-based pagination
 * @param cursor - The decoded cursor data
 * @param direction - Pagination direction
 * @returns Prisma where clause
 */
export function buildPrismaCursorWhere(
  cursor: CursorData | null,
  direction: CursorDirection,
): Record<string, unknown> | undefined {
  if (!cursor) return undefined;

  const cursorDate = new Date(cursor.d);

  if (direction === "forward") {
    // Get items created BEFORE cursor (older)
    return {
      OR: [
        { createdAt: { lt: cursorDate } },
        {
          createdAt: { equals: cursorDate },
          id: { lt: cursor.id },
        },
      ],
    };
  } else {
    // Get items created AFTER cursor (newer)
    return {
      OR: [
        { createdAt: { gt: cursorDate } },
        {
          createdAt: { equals: cursorDate },
          id: { gt: cursor.id },
        },
      ],
    };
  }
}

/**
 * Builds Prisma order by for cursor-based pagination
 * @returns Prisma orderBy array
 */
export function buildPrismaOrderBy(): Array<Record<string, string>> {
  // Always sort by createdAt desc, then id desc for stable ordering
  // For backward pagination, we reverse the results after fetching
  return [{ createdAt: "desc" }, { id: "desc" }];
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if an item is cursor paginable
 * @param item - Item to check
 * @returns True if item has required cursor fields
 */
export function isCursorPaginable(item: unknown): item is CursorPaginableItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "id" in item &&
    typeof item.id === "string" &&
    "createdAt" in item &&
    item.createdAt instanceof Date
  );
}
