import { UserRole } from "@prisma/client"

import { createCompany } from "@/app/actions/companies"
import { getNumericLimits } from "@/lib/subscription/config"

const mockAuth = jest.fn()
const mockCheckRateLimit = jest.fn()
const mockRevalidatePath = jest.fn()
const mockInvalidateCompanyCategoryReadModels = jest.fn()
const mockCompanyFindUnique = jest.fn()
const mockPrismaTransaction = jest.fn()

const mockTx = {
  category: {
    createMany: jest.fn(),
  },
  company: {
    create: jest.fn(),
  },
  companyUsage: {
    create: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
}

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findUnique: (...args: unknown[]) => mockCompanyFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}))

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

jest.mock("@/lib/cache/company-read-model-cache", () => ({
  invalidateCompanyCategoryReadModels: (...args: unknown[]) =>
    mockInvalidateCompanyCategoryReadModels(...args),
}))

describe("createCompany", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrismaTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>): Promise<unknown> => callback(mockTx)
    )
    mockTx.user.findUnique.mockResolvedValue({ companyId: null })
    mockTx.user.updateMany.mockResolvedValue({ count: 1 })
  })

  it("assigns ADMIN role to the company creator", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
      },
    })

    mockCheckRateLimit.mockResolvedValue({ allowed: true })
    mockCompanyFindUnique.mockResolvedValue(null)

    const createdCompany = {
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
    }

    mockTx.company.create.mockResolvedValue(createdCompany)
    mockTx.category.createMany.mockResolvedValue({ count: 5 })
    mockTx.subscription.create.mockResolvedValue({ id: "sub-1" })
    mockTx.companyUsage.create.mockResolvedValue({ id: "usage-1" })

    const formData = new FormData()
    formData.set("name", "Acme Inc")
    formData.set("slug", "acme-inc")

    const result = await createCompany(formData)

    expect(result).toEqual({
      success: true,
      company: createdCompany,
    })
    expect(mockTx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", companyId: null },
      data: {
        companyId: "company-1",
        role: UserRole.ADMIN,
      },
    })
    expect(mockInvalidateCompanyCategoryReadModels).toHaveBeenCalledWith("company-1")
  })

  it("initializes company usage limits from canonical FREE plan config", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
      },
    })

    mockCheckRateLimit.mockResolvedValue({ allowed: true })
    mockCompanyFindUnique.mockResolvedValue(null)

    const createdCompany = {
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
    }

    mockTx.company.create.mockResolvedValue(createdCompany)
    mockTx.category.createMany.mockResolvedValue({ count: 5 })
    mockTx.subscription.create.mockResolvedValue({ id: "sub-1" })
    mockTx.companyUsage.create.mockResolvedValue({ id: "usage-1" })

    const formData = new FormData()
    formData.set("name", "Acme Inc")
    formData.set("slug", "acme-inc")

    await createCompany(formData)

    const freePlanLimits = getNumericLimits("FREE")

    expect(mockTx.companyUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-1",
        maxExpenses: freePlanLimits.maxMonthlyExpenses,
        maxUsers: freePlanLimits.maxUsers,
        maxCategories: freePlanLimits.maxCategories,
      }),
    })
  })

  it("rejects whitespace-only company input before database work", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
      },
    })

    mockCheckRateLimit.mockResolvedValue({ allowed: true })

    const formData = new FormData()
    formData.set("name", "   ")
    formData.set("slug", "   ")

    const result = await createCompany(formData)

    expect(result).toEqual({
      success: false,
      error: "Company name and slug are required",
      code: "VALIDATION_ERROR",
    })
    expect(mockCompanyFindUnique).not.toHaveBeenCalled()
    expect(mockTx.company.create).not.toHaveBeenCalled()
  })

  it("normalizes trimmed company input before persistence", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
      },
    })

    mockCheckRateLimit.mockResolvedValue({ allowed: true })
    mockCompanyFindUnique.mockResolvedValue(null)

    const createdCompany = {
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
    }

    mockTx.company.create.mockResolvedValue(createdCompany)
    mockTx.category.createMany.mockResolvedValue({ count: 5 })
    mockTx.subscription.create.mockResolvedValue({ id: "sub-1" })
    mockTx.companyUsage.create.mockResolvedValue({ id: "usage-1" })

    const formData = new FormData()
    formData.set("name", "  Acme Inc  ")
    formData.set("slug", "  ACME-INC  ")

    const result = await createCompany(formData)

    expect(result).toEqual({
      success: true,
      company: createdCompany,
    })
    expect(mockCompanyFindUnique).toHaveBeenCalledWith({
      where: { slug: "acme-inc" },
    })
    expect(mockTx.company.create).toHaveBeenCalledWith({
      data: {
        name: "Acme Inc",
        slug: "acme-inc",
      },
    })
  })

  it("rejects creation when the user already belongs to a company", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
      },
    })

    mockCheckRateLimit.mockResolvedValue({ allowed: true })
    mockCompanyFindUnique.mockResolvedValue(null)
    mockTx.user.findUnique.mockResolvedValue({ companyId: "company-existing" })

    const formData = new FormData()
    formData.set("name", "Acme Inc")
    formData.set("slug", "acme-inc")

    const result = await createCompany(formData)

    expect(result).toEqual({
      success: false,
      error: "Leave your current company before creating a new one",
      code: "VALIDATION_ERROR",
    })
    expect(mockTx.company.create).not.toHaveBeenCalled()
    expect(mockTx.user.updateMany).not.toHaveBeenCalled()
  })
})
