import { renderToStaticMarkup } from "react-dom/server"

import LoginPage from "@/app/(auth)/login/page"
import { LoginForm } from "@/components/blocks/auth"

jest.mock("@/components/blocks/auth", () => ({
  LoginForm: jest.fn(() => null),
}))

const mockLoginForm = jest.mocked(LoginForm)

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("passes validated redirect and pricing intent to the login form", async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({
        plan: "pro",
        redirectTo: "/onboarding?redirectTo=%2Fdashboard%2Fbilling&plan=pro",
      }),
    })

    renderToStaticMarkup(element)

    expect(mockLoginForm).toHaveBeenCalledWith(
      {
        redirectTo: "/onboarding?redirectTo=%2Fdashboard%2Fbilling&plan=pro",
      },
      undefined
    )
  })

  it("falls back to dashboard when redirect target is unsafe", async () => {
    const element = await LoginPage({
      searchParams: Promise.resolve({
        plan: "free",
        redirectTo: "https://malicious.example",
      }),
    })

    renderToStaticMarkup(element)

    expect(mockLoginForm).toHaveBeenCalledWith(
      {
        redirectTo: "/dashboard",
      },
      undefined
    )
  })
})
