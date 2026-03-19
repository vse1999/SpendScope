import { renderToStaticMarkup } from "react-dom/server"

import SettingsPage from "@/app/(dashboard)/dashboard/settings/page"
import { AccountLinking } from "@/components/blocks/auth/account-linking"

const mockAuth = jest.fn()
const mockAccountFindMany = jest.fn()
const mockUserFindUnique = jest.fn()

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findMany: (...args: unknown[]) => mockAccountFindMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}))

jest.mock("@/components/blocks/auth/account-linking", () => ({
  AccountLinking: jest.fn(() => null),
}))

const mockAccountLinking = jest.mocked(AccountLinking)

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAccountFindMany.mockResolvedValue([{ provider: "google" }])
    mockUserFindUnique.mockResolvedValue({
      role: "ADMIN",
      company: {
        name: "DemoCorp",
      },
    })
  })

  it("hides account linking controls for the demo guest", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "demo-user",
        email: "alex.johnson@democorp.com",
        name: "Alex Johnson",
        role: "ADMIN",
      },
    })

    const element = await SettingsPage({
      searchParams: Promise.resolve({}),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain("Demo sign-in is read-only")
    expect(html).toContain("Google and GitHub account linking is disabled")
    expect(mockAccountLinking).not.toHaveBeenCalled()
  })

  it("renders account linking controls for normal users", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "owner@example.com",
        name: "Owner User",
        role: "ADMIN",
      },
    })

    const element = await SettingsPage({
      searchParams: Promise.resolve({
        stepUp: "true",
        linkTarget: "google",
      }),
    })

    renderToStaticMarkup(element)

    expect(mockAccountLinking).toHaveBeenCalledWith(
      {
        linkedProviders: ["google"],
        currentEmail: "owner@example.com",
        stepUpVerified: true,
        linkTarget: "google",
      },
      undefined
    )
  })
})
