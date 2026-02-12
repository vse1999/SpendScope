/**
 * Expense Sorting Utilities
 * 
 * These are separated from the server actions file because
 * "use server" files can only export async functions.
 */

/**
 * Sort field options for expenses
 */
export type ExpenseSortField = "date" | "amount" | "category" | "user" | "createdAt";

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Individual sort configuration for one column
 */
export interface SortConfig {
  field: ExpenseSortField;
  direction: SortDirection;
}

/**
 * Multi-sort configuration - array of sort configs
 * First item is primary sort, second is secondary, etc.
 * Maximum 3 sort levels are supported
 */
export type MultiSortConfig = SortConfig[];

/**
 * Maximum number of sort levels allowed
 */
export const MAX_SORT_LEVELS = 3;

/**
 * Valid sort fields for validation
 */
export const VALID_SORT_FIELDS: ExpenseSortField[] = [
  "date", 
  "amount", 
  "category", 
  "user", 
  "createdAt"
];

/**
 * Parse multi-sort from URL parameter string
 * Format: "date:desc,amount:asc,user:asc"
 * @param sortParam - The URL parameter value
 * @returns Array of SortConfig, default if invalid
 */
export function parseMultiSort(sortParam: string | null | undefined): MultiSortConfig {
  if (!sortParam) {
    return [{ field: "date", direction: "desc" }];
  }

  const sorts: SortConfig[] = [];
  const parts = sortParam.split(",");

  for (const part of parts) {
    const [field, direction] = part.split(":");
    
    if (field && VALID_SORT_FIELDS.includes(field as ExpenseSortField)) {
      sorts.push({
        field: field as ExpenseSortField,
        direction: direction === "asc" ? "asc" : "desc",
      });
    }

    // Stop at max sort levels
    if (sorts.length >= MAX_SORT_LEVELS) {
      break;
    }
  }

  // Return default if no valid sorts found
  if (sorts.length === 0) {
    return [{ field: "date", direction: "desc" }];
  }

  return sorts;
}

/**
 * Serialize multi-sort config to URL parameter string
 * Format: "date:desc,amount:asc,user:asc"
 * @param configs - Array of SortConfig
 * @returns URL parameter string
 */
export function serializeMultiSort(configs: MultiSortConfig): string {
  return configs
    .slice(0, MAX_SORT_LEVELS)
    .map(config => `${config.field}:${config.direction}`)
    .join(",");
}

/**
 * Get human-readable label for sort field
 */
export function getSortFieldLabel(field: ExpenseSortField): string {
  const labels: Record<ExpenseSortField, string> = {
    date: "Date",
    amount: "Amount",
    category: "Category",
    user: "User",
    createdAt: "Created",
  };
  return labels[field] || field;
}

/**
 * Get the default direction for a field
 */
export function getDefaultDirection(field: ExpenseSortField): "asc" | "desc" {
  // Text fields default to asc, date/number fields default to desc
  return (field === "user" || field === "category") ? "asc" : "desc";
}

/**
 * Get priority indicator (1°, 2°, 3°) based on sort index
 */
export function getSortPriorityLabel(index: number): string {
  return `${index + 1}°`;
}
