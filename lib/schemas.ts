import { z } from "zod";

/**
 * Zod validation schemas for SpendScope expense tracking
 * Compatible with react-hook-form and server actions
 */

// Regular expression for hex color validation (#RGB or #RRGGBB)
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// CUID format regex (starts with 'c' followed by alphanumeric characters)
const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Base expense schema for forms (without transform)
 * Use this with react-hook-form
 */
export const expenseFormSchema = z.object({
  amount: z
    .string()
    .min(1, { message: "Az összeg megadása kötelező / Amount is required" })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Az összegnek pozitív számnak kell lennie / Amount must be a positive number",
    })
    .refine((val) => parseFloat(val) <= 999999.99, {
      message: "Az összeg maximum 999,999.99 lehet / Amount cannot exceed 999,999.99",
    }),

  description: z
    .string()
    .min(1, { message: "A leírás megadása kötelező / Description is required" })
    .max(500, { message: "A leírás maximum 500 karakter lehet / Description cannot exceed 500 characters" }),

  date: z
    .string()
    .min(1, { message: "A dátum megadása kötelező / Date is required" })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Érvénytelen dátum formátum / Invalid date format",
    }),

  categoryId: z
    .string()
    .min(1, { message: "A kategória kiválasztása kötelező / Category is required" })
    .regex(CUID_REGEX, { message: "Érvénytelen kategória azonosító / Invalid category ID" }),
});

/**
 * Base expense schema with transform for server actions
 * Amount is transformed to number
 */
export const expenseSchema = expenseFormSchema.extend({
  amount: expenseFormSchema.shape.amount.transform((val) => parseFloat(val)),

  description: z
    .string()
    .min(1, { message: "A leírás megadása kötelező / Description is required" })
    .max(500, { message: "A leírás maximum 500 karakter lehet / Description cannot exceed 500 characters" }),

  date: z
    .string()
    .min(1, { message: "A dátum megadása kötelező / Date is required" })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Érvénytelen dátum formátum / Invalid date format",
    }),

  categoryId: z
    .string()
    .min(1, { message: "A kategória kiválasztása kötelező / Category is required" })
    .regex(CUID_REGEX, { message: "Érvénytelen kategória azonosító / Invalid category ID" }),
});

/**
 * Schema for creating a new expense
 * Same as base expenseSchema
 */
export const createExpenseSchema = expenseSchema;

/**
 * Schema for updating an existing expense
 * All fields required (full form edit)
 */
export const updateExpenseSchema = expenseSchema;

/**
 * Schema for category validation
 */
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, { message: "A név megadása kötelező / Name is required" })
    .max(50, { message: "A név maximum 50 karakter lehet / Name cannot exceed 50 characters" }),

  color: z
    .string()
    .min(1, { message: "A szín megadása kötelező / Color is required" })
    .regex(HEX_COLOR_REGEX, { message: "Érvénytelen hex szín formátum / Invalid hex color format (use #RGB or #RRGGBB)" }),

  icon: z
    .string()
    .min(1, { message: "Az ikon megadása kötelező / Icon is required" }),
});

/**
 * Schema for updating a category
 * All fields optional except id
 */
export const updateCategorySchema = z.object({
  id: z
    .string()
    .regex(CUID_REGEX, { message: "Érvénytelen azonosító / Invalid ID" }),

  name: z
    .string()
    .min(1, { message: "A név nem lehet üres / Name cannot be empty" })
    .max(50, { message: "A név maximum 50 karakter lehet / Name cannot exceed 50 characters" })
    .optional(),

  color: z
    .string()
    .regex(HEX_COLOR_REGEX, { message: "Érvénytelen hex szín formátum / Invalid hex color format (use #RGB or #RRGGBB)" })
    .optional(),

  icon: z
    .string()
    .min(1, { message: "Az ikon nem lehet üres / Icon cannot be empty" })
    .optional(),
});

// ============================================
// TypeScript Types (inferred from schemas)
// ============================================

/**
 * Type for expense form (amount is string)
 * Use with react-hook-form
 */
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;

/**
 * Type for creating a new expense (amount is number)
 * Use with server actions
 */
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

