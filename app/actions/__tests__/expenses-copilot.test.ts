import { UserRole } from "@prisma/client";
import {
  getExpenseCopilotAlerts,
  resolveExpenseCopilotAlert,
  updateGlobalExpensePolicyThreshold,
} from "@/app/actions/expenses";

const mockAuth = jest.fn();
const mockRevalidatePath = jest.fn();
const mockPrismaUserFindUnique = jest.fn();
const mockPrismaExpenseFindMany = jest.fn();
const mockPrismaExpenseFindFirst = jest.fn();
const mockPrismaExpenseHistoryFindMany = jest.fn();
const mockPrismaExpenseHistoryFindFirst = jest.fn();
const mockPrismaExpenseHistoryCreate = jest.fn();
const mockPrismaQueryRaw = jest.fn();
const mockGetExpensePolicyConfig = jest.fn();
const mockUpsertGlobalExpensePolicyRule = jest.fn();

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("@/lib/expenses/policy-service", () => ({
  getExpensePolicyConfig: (...args: unknown[]) => mockGetExpensePolicyConfig(...args),
  listExpensePolicyRules: jest.fn(),
  upsertGlobalExpensePolicyRule: (...args: unknown[]) => mockUpsertGlobalExpensePolicyRule(...args),
  upsertCategoryExpensePolicyRule: jest.fn(),
  deleteCategoryExpensePolicyRule: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
    expense: {
      findMany: (...args: unknown[]) => mockPrismaExpenseFindMany(...args),
      findFirst: (...args: unknown[]) => mockPrismaExpenseFindFirst(...args),
    },
    expenseHistory: {
      findMany: (...args: unknown[]) => mockPrismaExpenseHistoryFindMany(...args),
      findFirst: (...args: unknown[]) => mockPrismaExpenseHistoryFindFirst(...args),
      create: (...args: unknown[]) => mockPrismaExpenseHistoryCreate(...args),
    },
    $queryRaw: (...args: unknown[]) => mockPrismaQueryRaw(...args),
  },
}));

describe("expense copilot actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaQueryRaw.mockResolvedValue([]);
    mockGetExpensePolicyConfig.mockResolvedValue({
      globalThresholdUsd: 1000,
      globalRequiresReceiptAboveUsd: null,
      categoryThresholds: {},
    });
    mockUpsertGlobalExpensePolicyRule.mockResolvedValue({});
  });

  it("returns unauthorized when reading alerts without session", async (): Promise<void> => {
    mockAuth.mockResolvedValue(null);

    const result = await getExpenseCopilotAlerts();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
  });

  it("returns open alerts for authenticated company user", async (): Promise<void> => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockPrismaUserFindUnique.mockResolvedValue({ id: "user-1", companyId: "company-1" });
    mockPrismaExpenseFindMany.mockResolvedValue([
      {
        id: "exp-1",
        amount: 1299,
        description: "Laptop replacement",
        date: new Date("2026-02-12T10:00:00.000Z"),
        categoryId: "cat-1",
        userId: "member-1",
        category: { name: "Hardware" },
        user: { name: "Member", email: "member@company.com" },
      },
    ]);
    mockPrismaExpenseHistoryFindMany.mockResolvedValue([]);

    const result = await getExpenseCopilotAlerts();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].ruleType).toBe("POLICY_BREACH");
      expect(result.alerts[0].id).toBe("exp-1:POLICY_BREACH");
    }
  });

  it("blocks alert resolution for non-admin users", async (): Promise<void> => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "member-1",
      role: UserRole.MEMBER,
      companyId: "company-1",
      name: "Member",
      email: "member@company.com",
    });

    const result = await resolveExpenseCopilotAlert("exp-1:POLICY_BREACH", "APPROVE");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
  });

  it("resolves alert as dismissed for expense owner", async (): Promise<void> => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "admin-1",
      role: UserRole.ADMIN,
      companyId: "company-1",
      name: "Admin",
      email: "admin@company.com",
    });
    mockPrismaExpenseFindFirst.mockResolvedValue({
      id: "exp-1",
      userId: "member-1",
      description: "Conference travel",
      amount: 540,
    });
    mockPrismaExpenseHistoryFindFirst.mockResolvedValue(null);
    mockPrismaExpenseHistoryCreate.mockResolvedValue({
      id: "history-1",
    });

    const result = await resolveExpenseCopilotAlert("exp-1:POLICY_BREACH", "DISMISS");

    expect(result).toEqual({
      success: true,
      alertId: "exp-1:POLICY_BREACH",
      status: "DISMISSED",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/expenses");
  });

  it("allows admin to update global policy threshold", async (): Promise<void> => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "admin-1",
      role: UserRole.ADMIN,
      companyId: "company-1",
    });

    const result = await updateGlobalExpensePolicyThreshold(1750);

    expect(result).toEqual({ success: true });
    expect(mockUpsertGlobalExpensePolicyRule).toHaveBeenCalledWith(
      "company-1",
      1750,
      null,
      "admin-1"
    );
  });

  it("blocks non-admin from updating global policy threshold", async (): Promise<void> => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "member-1",
      role: UserRole.MEMBER,
      companyId: "company-1",
    });

    const result = await updateGlobalExpensePolicyThreshold(1750);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
    expect(mockUpsertGlobalExpensePolicyRule).not.toHaveBeenCalled();
  });
});
