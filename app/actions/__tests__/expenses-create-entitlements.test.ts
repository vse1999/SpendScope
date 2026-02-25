import { UserRole } from "@prisma/client";
import { createExpense } from "@/app/actions/expenses-create";
import { FeatureGateError } from "@/lib/errors";

const mockAuth = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockCheckFeatureLimit = jest.fn();
const mockConsumeResource = jest.fn();
const mockGetCurrentUserCompanyId = jest.fn();
const mockEvaluateBudgetPolicyForExpenseChange = jest.fn();
const mockRevalidatePath = jest.fn();
const mockCreateNotification = jest.fn();
const mockSerializeExpense = jest.fn();
const mockCreateExpenseSchemaSafeParse = jest.fn();

const mockPrismaCategoryFindFirst = jest.fn();
const mockPrismaUserFindMany = jest.fn();
const mockPrismaTransaction = jest.fn();
const mockTxExpenseCreate = jest.fn();

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock("@/lib/subscription/feature-gate-service", () => ({
  checkFeatureLimit: (...args: unknown[]) => mockCheckFeatureLimit(...args),
  consumeResource: (...args: unknown[]) => mockConsumeResource(...args),
}));

jest.mock("@/app/actions/expenses-shared", () => ({
  getCurrentUserCompanyId: (...args: unknown[]) => mockGetCurrentUserCompanyId(...args),
}));

jest.mock("@/lib/budget/service", () => ({
  evaluateBudgetPolicyForExpenseChange: (...args: unknown[]) =>
    mockEvaluateBudgetPolicyForExpenseChange(...args),
}));

jest.mock("@/lib/expenses/action-helpers", () => ({
  serializeExpense: (...args: unknown[]) => mockSerializeExpense(...args),
}));

jest.mock("@/app/actions/notifications", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("@/lib/schemas", () => ({
  createExpenseSchema: {
    safeParse: (...args: unknown[]) => mockCreateExpenseSchemaSafeParse(...args),
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findFirst: (...args: unknown[]) => mockPrismaCategoryFindFirst(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockPrismaUserFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}));

const LIMIT_CHECK_UNAVAILABLE_MESSAGE =
  "Unable to verify plan limits right now. Please try again.";

function buildFormData(): FormData {
  const formData = new FormData();
  formData.set("amount", "125.50");
  formData.set("description", "Cloud software");
  formData.set("date", "2026-02-23");
  formData.set("categoryId", "cat-1");
  return formData;
}

describe("createExpense entitlement hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        role: UserRole.ADMIN,
        name: "Admin User",
        email: "admin@company.com",
      },
    });
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockGetCurrentUserCompanyId.mockResolvedValue("company-1");
    mockPrismaCategoryFindFirst.mockResolvedValue({ id: "cat-1" });
    mockEvaluateBudgetPolicyForExpenseChange.mockResolvedValue({ allowed: true });
    mockCreateExpenseSchemaSafeParse.mockReturnValue({
      success: true,
      data: {
        amount: 125.5,
        description: "Cloud software",
        date: "2026-02-23",
        categoryId: "cat-1",
      },
    });
    mockPrismaUserFindMany.mockResolvedValue([]);
    mockSerializeExpense.mockImplementation((expense: unknown) => expense);

    const tx = {
      expense: {
        create: (...args: unknown[]) => mockTxExpenseCreate(...args),
      },
    };
    mockPrismaTransaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>): Promise<unknown> =>
        callback(tx)
    );
    mockTxExpenseCreate.mockResolvedValue({
      id: "expense-1",
      amount: "125.50",
      description: "Cloud software",
      date: new Date("2026-02-23T00:00:00.000Z"),
      categoryId: "cat-1",
      userId: "user-1",
      companyId: "company-1",
      createdAt: new Date("2026-02-23T00:00:00.000Z"),
      updatedAt: new Date("2026-02-23T00:00:00.000Z"),
    });
  });

  it("denies creation when entitlement check is unavailable", async (): Promise<void> => {
    mockCheckFeatureLimit.mockRejectedValue(new Error("cache unavailable"));

    const result = await createExpense(buildFormData());

    expect(result).toEqual({
      success: false,
      error: LIMIT_CHECK_UNAVAILABLE_MESSAGE,
      code: "LIMIT_CHECK_UNAVAILABLE",
    });
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
    expect(mockTxExpenseCreate).not.toHaveBeenCalled();
  });

  it("returns limit exceeded when plan limit check denies access", async (): Promise<void> => {
    mockCheckFeatureLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      reason: "Monthly expense limit exceeded",
    });

    const result = await createExpense(buildFormData());

    expect(result).toEqual({
      success: false,
      error: "Monthly expense limit exceeded",
      code: "LIMIT_EXCEEDED",
    });
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
    expect(mockTxExpenseCreate).not.toHaveBeenCalled();
  });

  it("aborts create when consumeResource throws FeatureGateError", async (): Promise<void> => {
    mockCheckFeatureLimit.mockResolvedValue({ allowed: true, remaining: 10 });
    mockConsumeResource.mockRejectedValue(
      new FeatureGateError("Expense limit reached", "expense", 100, 100)
    );

    const result = await createExpense(buildFormData());

    expect(result).toEqual({
      success: false,
      error: "Expense limit reached",
      code: "LIMIT_EXCEEDED",
    });
    expect(mockTxExpenseCreate).not.toHaveBeenCalled();
  });

  it("denies create when consumeResource fails with infrastructure error", async (): Promise<void> => {
    mockCheckFeatureLimit.mockResolvedValue({ allowed: true, remaining: 10 });
    mockConsumeResource.mockRejectedValue(new Error("database timeout"));

    const result = await createExpense(buildFormData());

    expect(result).toEqual({
      success: false,
      error: LIMIT_CHECK_UNAVAILABLE_MESSAGE,
      code: "LIMIT_CHECK_UNAVAILABLE",
    });
    expect(mockTxExpenseCreate).not.toHaveBeenCalled();
  });

  it("creates expense when entitlement checks and consumption succeed", async (): Promise<void> => {
    mockCheckFeatureLimit.mockResolvedValue({ allowed: true, remaining: 10 });
    mockConsumeResource.mockResolvedValue({ used: 91, remaining: 9 });

    const result = await createExpense(buildFormData());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.expense.id).toBe("expense-1");
    }
    expect(mockTxExpenseCreate).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/expenses");
  });
});
