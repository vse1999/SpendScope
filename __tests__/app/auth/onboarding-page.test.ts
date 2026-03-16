import { renderToStaticMarkup } from "react-dom/server"
import type { Session } from "next-auth"

import OnboardingPage from "@/app/(auth)/onboarding/page"
import { getAllCompanies, getUserCompany } from "@/app/actions/companies"
import { auth } from "@/auth"
import { CompanySelector } from "@/components/features/onboarding"

const mockRedirect = jest.fn()

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/app/actions/companies", () => ({
  getAllCompanies: jest.fn(),
  getUserCompany: jest.fn(),
}))

jest.mock("@/components/features/onboarding", () => ({
  CompanySelector: jest.fn(() => null),
  CompanyWelcome: jest.fn(() => null),
  FeatureHighlights: jest.fn(() => null),
}))

const mockAuth = jest.mocked(auth)
const mockGetAllCompanies = jest.mocked(getAllCompanies)
const mockGetUserCompany = jest.mocked(getUserCompany)
const mockCompanySelector = jest.mocked(CompanySelector)

const baseSession: Session = {
  user: {
    id: "user-1",
    email: "owner@example.com",
    name: "Owner User",
    image: null,
    role: "ADMIN",
  },
  expires: "2026-12-31T00:00:00.000Z",
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(baseSession as never)
    mockGetAllCompanies.mockResolvedValue([])
  })

  it("redirects users with a company to the preserved destination", async () => {
    mockGetUserCompany.mockResolvedValue({
      hasCompany: true,
      company: {
        id: "company-1",
        name: "Acme Inc",
        slug: "acme-inc",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        _count: {
          users: 1,
        },
      },
    })

    await OnboardingPage({
      searchParams: Promise.resolve({
        redirectTo: "/dashboard/billing",
      }),
    })

    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/billing")
  })

  it("passes the preserved destination into the company selector", async () => {
    mockGetUserCompany.mockResolvedValue({
      hasCompany: false,
    })

    const element = await OnboardingPage({
      searchParams: Promise.resolve({
        redirectTo: "/dashboard/billing",
      }),
    })

    renderToStaticMarkup(element)

    expect(mockCompanySelector).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectTo: "/dashboard/billing",
      }),
      undefined
    )
  })
})
