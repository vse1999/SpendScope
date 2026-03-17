import { NotificationType, SubscriptionPlan, UserRole } from "@prisma/client"

import { joinCompany } from "@/app/actions/companies"
import { getNumericLimits } from "@/lib/subscription/config"

const mockAuth = jest.fn()
const mockCheckRateLimit = jest.fn()
const mockRevalidatePath = jest.fn()
const mockPrismaTransaction = jest.fn()
const mockUserFindMany = jest.fn()
const mockUserFindUnique = jest.fn()
const mockCompanyFindUnique = jest.fn()
const mockNotificationCreateMany = jest.fn()

const mockTx = {
  company: {
    findUnique: jest.fn(),
  },
  invitation: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
}

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findUnique: (...args: unknown[]) => mockCompanyFindUnique(...args),
    },
    notification: {
      createMany: (...args: unknown[]) => mockNotificationCreateMany(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockPrismaTransaction(...args),
  },
}))

describe("joinCompany", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrismaTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>): Promise<unknown> =>
        callback(mockTx)
    )
    mockTx.user.findUnique.mockResolvedValue({ companyId: null })
    mockTx.invitation.updateMany.mockResolvedValue({ count: 1 })
    mockTx.user.updateMany.mockResolvedValue({ count: 1 })
  })

  it("enforces the user limit from inside the transaction", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "member@example.com",
      },
    })
    mockCheckRateLimit.mockResolvedValue({ allowed: true })
    mockTx.company.findUnique.mockResolvedValue({
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
      subscription: { plan: SubscriptionPlan.FREE },
      _count: { users: getNumericLimits(SubscriptionPlan.FREE).maxUsers },
    })
    mockTx.invitation.findFirst.mockResolvedValue({
      id: "invite-1",
      role: UserRole.MEMBER,
    })

    const result = await joinCompany("company-1")

    expect(result).toEqual({
      success: false,
      error: `This company has reached the maximum user limit (${getNumericLimits(SubscriptionPlan.FREE).maxUsers}). Upgrade to Pro for unlimited users.`,
      code: "LIMIT_EXCEEDED",
    })
    expect(mockTx.invitation.updateMany).not.toHaveBeenCalled()
    expect(mockTx.user.updateMany).not.toHaveBeenCalled()
  })

  it("batches member notifications after a successful join", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "member@example.com",
        name: "Taylor Doe",
      },
    })
    mockCheckRateLimit.mockResolvedValue({ allowed: true })
    mockTx.company.findUnique.mockResolvedValue({
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
      subscription: { plan: SubscriptionPlan.FREE },
      _count: { users: 1 },
    })
    mockTx.invitation.findFirst.mockResolvedValue({
      id: "invite-1",
      role: UserRole.MEMBER,
    })
    mockUserFindMany.mockResolvedValue([{ id: "admin-1" }])
    mockNotificationCreateMany.mockResolvedValue({ count: 2 })

    const result = await joinCompany("company-1")

    expect(result).toEqual({
      success: true,
      company: {
        id: "company-1",
        name: "Acme Inc",
        slug: "acme-inc",
      },
    })
    expect(mockTx.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invite-1",
        companyId: "company-1",
        email: "member@example.com",
        status: "PENDING",
        expiresAt: { gte: expect.any(Date) },
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: expect.any(Date),
      },
    })
    expect(mockTx.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        companyId: null,
      },
      data: {
        companyId: "company-1",
        role: UserRole.MEMBER,
      },
    })
    expect(mockNotificationCreateMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "admin-1",
          type: NotificationType.INFO,
          title: "New Team Member",
          message: 'Taylor Doe joined "Acme Inc"',
        },
        {
          userId: "user-1",
          type: NotificationType.SUCCESS,
          title: "Welcome to the Team!",
          message: 'You\'ve successfully joined "Acme Inc"',
        },
      ],
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/team")
  })

  it("treats a concurrent membership claim as already joined when the user now belongs to the company", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "member@example.com",
        name: "Taylor Doe",
      },
    })
    mockCheckRateLimit.mockResolvedValue({ allowed: true })
    mockTx.company.findUnique.mockResolvedValue({
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
      subscription: { plan: SubscriptionPlan.FREE },
      _count: { users: 1 },
    })
    mockTx.invitation.findFirst.mockResolvedValue({
      id: "invite-1",
      role: UserRole.MEMBER,
    })
    mockTx.user.updateMany.mockResolvedValue({ count: 0 })
    mockUserFindUnique.mockResolvedValue({ companyId: "company-1" })
    mockCompanyFindUnique.mockResolvedValue({
      id: "company-1",
      name: "Acme Inc",
      slug: "acme-inc",
    })

    const result = await joinCompany("company-1")

    expect(result).toEqual({
      success: true,
      company: {
        id: "company-1",
        name: "Acme Inc",
        slug: "acme-inc",
      },
    })
    expect(mockCompanyFindUnique).toHaveBeenCalledWith({
      where: { id: "company-1" },
      select: { id: true, name: true, slug: true },
    })
    expect(mockNotificationCreateMany).not.toHaveBeenCalled()
  })
})
