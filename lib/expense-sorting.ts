/**
 * Expense Sorting Utilities
 *
 * These are separated from server action files because
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
 * Multi-sort configuration - array of sort configs.
 * First item is primary sort, second is secondary, etc.
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
  "createdAt",
];

/**
 * Parse multi-sort from URL parameter string.
 * Format: "date:desc,amount:asc,user:asc"
 */
export function parseMultiSort(sortParam: string | null | undefined): MultiSortConfig {
  if (!sortParam) {
    return [{ field: "date", direction: "desc" }];
  }

  const sorts: SortConfig[] = [];
  const seenFields = new Set<ExpenseSortField>();
  const parts = sortParam.split(",");

  for (const part of parts) {
    const [rawField, rawDirection] = part.split(":");
    const field = rawField?.trim();
    const direction = rawDirection?.trim();

    if (!field) {
      continue;
    }

    const parsedField = field as ExpenseSortField;
    if (!VALID_SORT_FIELDS.includes(parsedField) || seenFields.has(parsedField)) {
      continue;
    }

    sorts.push({
      field: parsedField,
      direction: direction === "asc" ? "asc" : "desc",
    });
    seenFields.add(parsedField);

    if (sorts.length >= MAX_SORT_LEVELS) {
      break;
    }
  }

  if (sorts.length === 0) {
    return [{ field: "date", direction: "desc" }];
  }

  return sorts;
}

/**
 * Serialize multi-sort config to URL parameter string.
 * Format: "date:desc,amount:asc,user:asc"
 */
export function serializeMultiSort(configs: MultiSortConfig): string {
  return configs
    .slice(0, MAX_SORT_LEVELS)
    .map((config) => `${config.field}:${config.direction}`)
    .join(",");
}

/**
 * Get human-readable label for sort field.
 */
export function getSortFieldLabel(field: ExpenseSortField): string {
  const labels: Record<ExpenseSortField, string> = {
    date: "Date",
    amount: "Amount",
    category: "Category",
    user: "User",
    createdAt: "Created",
  };

  return labels[field];
}

/**
 * Get the default direction for a field.
 */
export function getDefaultDirection(field: ExpenseSortField): SortDirection {
  // Text fields default to asc, date/number fields default to desc.
  return field === "user" || field === "category" ? "asc" : "desc";
}

/**
 * Get priority indicator (#1, #2, #3) based on sort index.
 */
export function getSortPriorityLabel(index: number): string {
  return `#${index + 1}`;
}

export function toggleSortDirection(direction: SortDirection): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}

interface NextSortConfigArgs {
  current: MultiSortConfig;
  field: ExpenseSortField;
  isShiftClick: boolean;
}

/**
 * Sorting interaction model:
 * - Click: single-column sort (toggle if same field)
 * - Shift+click: add/toggle secondary sort while preserving existing priorities
 */
export function getNextSortConfig({ current, field, isShiftClick }: NextSortConfigArgs): MultiSortConfig {
  if (!isShiftClick) {
    const existing = current.find((sort) => sort.field === field);
    const direction = existing ? toggleSortDirection(existing.direction) : getDefaultDirection(field);
    return [{ field, direction }];
  }

  const existingIndex = current.findIndex((sort) => sort.field === field);
  if (existingIndex >= 0) {
    const updated = [...current];
    const sortToUpdate = updated[existingIndex];
    updated[existingIndex] = { ...sortToUpdate, direction: toggleSortDirection(sortToUpdate.direction) };
    return updated;
  }

  const nextSort: SortConfig = { field, direction: getDefaultDirection(field) };
  return [...current, nextSort].slice(0, MAX_SORT_LEVELS);
}
