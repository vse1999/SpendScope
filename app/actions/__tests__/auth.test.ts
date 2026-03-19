import { unlinkProvider } from "@/app/actions/auth"

const mockAuth = jest.fn()
const mockAccountFindMany = jest.fn()
const mockAccountDelete = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findMany: (...args: unknown[]) => mockAccountFindMany(...args),
      delete: (...args: unknown[]) => mockAccountDelete(...args),
    },
  },
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

describe("unlinkProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("blocks provider changes for the demo guest", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "demo-user",
        email: "alex.johnson@democorp.com",
      },
    })

    const result = await unlinkProvider("google")

    expect(result).toEqual({
      error: "Demo access cannot connect or remove authentication providers.",
    })
    expect(mockAccountFindMany).not.toHaveBeenCalled()
    expect(mockAccountDelete).not.toHaveBeenCalled()
  })

  it("unlinks a provider for a normal user when multiple providers exist", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "owner@example.com",
      },
    })
    mockAccountFindMany.mockResolvedValue([
      { id: "acct-1", provider: "google" },
      { id: "acct-2", provider: "github" },
    ])

    const result = await unlinkProvider("google")

    expect(result).toEqual({ success: true })
    expect(mockAccountFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
    expect(mockAccountDelete).toHaveBeenCalledWith({
      where: { id: "acct-1" },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/settings")
  })
})
