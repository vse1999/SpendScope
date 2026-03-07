import { UserRole } from "@prisma/client";
import { bulkDeleteExpenses, bulkUpdateCategory } from "@/app/actions/expenses-bulk";

const mockAuth = jest.fn();
const mockRevalidatePath = jest.fn();
const mockInvalidateCompanyExpenseReadModels = jest.fn();
const mockDecrementResource = jest.fn();

const mockPrismaUserFindUnique = jest.fn();
const mockPrismaExpenseFindMany = jest.fn();
const mockPrismaExpenseDeleteMany = jest.fn();
const mockPrismaExpenseUpdateMany = jest.fn();
const mockPrismaCategoryFindFirst = jest.fn();

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("@/lib/cache/company-read-model-cache", () => ({
  invalidateCompanyExpenseReadModels: (...args: unknown[]) =>
    mockInvalidateCompanyExpenseReadModels(...args),
}));

jest.mock("@/lib/subscription/feature-gate-service", () => ({
  decrementResource: (...args: unknown[]) => mockDecrementResource(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
    expense: {
      findMany: (...args: unknown[]) => mockPrismaExpenseFindMany(...args),
      deleteMany: (...args: unknown[]) => mockPrismaExpenseDeleteMany(...args),
      updateMany: (...args: unknown[]) => mockPrismaExpenseUpdateMany(...args),
    },
    category: {
      findFirst: (...args: unknown[]) => mockPrismaCategoryFindFirst(...args),
    },
  },
}));

describe("expenses bulk actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth.mockResolvedValue({
      user: {
        id: "member-1",
        role: UserRole.MEMBER,
      },
    });

    mockPrismaUserFindUnique.mockResolvedValue({
      companyId: "company-1",
    });
  });

  it("returns deletedIds and skippedIds for partial bulk delete", async (): Promise<void> => {
    mockPrismaExpenseFindMany.mockResolvedValue([
      { id: "expense-1", userId: "member-1" },
      { id: "expense-2", userId: "other-user" },
    ]);
    mockPrismaExpenseDeleteMany.mockResolvedValue({ count: 1 });
    mockDecrementResource.mockResolvedValue({ used: 10, remaining: 90 });

    const result = await bulkDeleteExpenses(["expense-1", "expense-2"]);

    expect(result).toEqual({
      success: true,
      deletedCount: 1,
      deletedIds: ["expense-1"],
      skippedIds: ["expense-2"],
    });
    expect(mockPrismaExpenseDeleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["expense-1"] },
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/expenses");
    expect(mockInvalidateCompanyExpenseReadModels).toHaveBeenCalledWith("company-1");
  });

  it("returns updatedIds and skippedIds for partial bulk category update", async (): Promise<void> => {
    mockPrismaCategoryFindFirst.mockResolvedValue({ id: "cat-1" });
    mockPrismaExpenseFindMany.mockResolvedValue([
      { id: "expense-1", userId: "member-1" },
      { id: "expense-2", userId: "other-user" },
    ]);
    mockPrismaExpenseUpdateMany.mockResolvedValue({ count: 1 });

    const result = await bulkUpdateCategory(["expense-1", "expense-2"], "cat-1");

    expect(result).toEqual({
      success: true,
      updatedCount: 1,
      updatedIds: ["expense-1"],
      skippedIds: ["expense-2"],
    });
    expect(mockPrismaExpenseUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["expense-1"] },
      },
      data: {
        categoryId: "cat-1",
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/expenses");
    expect(mockInvalidateCompanyExpenseReadModels).toHaveBeenCalledWith("company-1");
  });
});
