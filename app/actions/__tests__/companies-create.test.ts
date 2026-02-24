import { UserRole } from "@prisma/client";
import { createCompany } from "@/app/actions/companies";
import { getNumericLimits } from "@/lib/subscription/config";

const mockAuth = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockRevalidatePath = jest.fn();
const mockCompanyFindUnique = jest.fn();
const mockPrismaTransaction = jest.fn();

const mockTx = {
  company: {
    create: jest.fn(),
  },
  category: {
    createMany: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
  },
  companyUsage: {
    create: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
};

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findUnique: (...args: unknown[]) => mockCompanyFindUnique(...args),
    },
    invitation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock("@/lib/subscription/feature-gate-service", () => ({
  checkFeatureLimit: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("@/app/actions/notifications", () => ({
  createNotification: jest.fn(),
}));

describe("createCompany", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>): Promise<unknown> => callback(mockTx)
    );
  });

  it("assigns ADMIN role to the company creator", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockCompanyFindUnique.mockResolvedValue(null);

    const createdCompany = {
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
    };

    mockTx.company.create.mockResolvedValue(createdCompany);
    mockTx.category.createMany.mockResolvedValue({ count: 5 });
    mockTx.subscription.create.mockResolvedValue({ id: "sub-1" });
    mockTx.companyUsage.create.mockResolvedValue({ id: "usage-1" });
    mockTx.user.update.mockResolvedValue({
      id: "user-1",
      companyId: "company-1",
      role: UserRole.ADMIN,
    });

    const formData = new FormData();
    formData.set("name", "Acme Inc");
    formData.set("slug", "acme-inc");

    const result = await createCompany(formData);

    expect(result).toEqual({
      success: true,
      company: createdCompany,
    });

    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        companyId: "company-1",
        role: UserRole.ADMIN,
      },
    });
  });

  it("initializes company usage limits from canonical FREE plan config", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockCompanyFindUnique.mockResolvedValue(null);

    const createdCompany = {
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
    };

    mockTx.company.create.mockResolvedValue(createdCompany);
    mockTx.category.createMany.mockResolvedValue({ count: 5 });
    mockTx.subscription.create.mockResolvedValue({ id: "sub-1" });
    mockTx.companyUsage.create.mockResolvedValue({ id: "usage-1" });
    mockTx.user.update.mockResolvedValue({
      id: "user-1",
      companyId: "company-1",
      role: UserRole.ADMIN,
    });

    const formData = new FormData();
    formData.set("name", "Acme Inc");
    formData.set("slug", "acme-inc");

    await createCompany(formData);

    const freePlanLimits = getNumericLimits("FREE");

    expect(mockTx.companyUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-1",
        maxExpenses: freePlanLimits.maxMonthlyExpenses,
        maxUsers: freePlanLimits.maxUsers,
        maxCategories: freePlanLimits.maxCategories,
      }),
    });
  });
});
