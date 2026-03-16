import SignupPage from "@/app/signup/page"

const mockRedirect = jest.fn()

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

describe("SignupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("forwards pricing intent and redirect target to login", async () => {
    await SignupPage({
      searchParams: Promise.resolve({
        plan: "pro",
        redirectTo: "/onboarding?redirectTo=%2Fdashboard%2Fbilling&plan=pro",
      }),
    })

    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?intent=signup&plan=pro&redirectTo=%2Fonboarding%3FredirectTo%3D%252Fdashboard%252Fbilling%26plan%3Dpro"
    )
  })

  it("falls back to dashboard when redirect target is unsafe", async () => {
    await SignupPage({
      searchParams: Promise.resolve({
        plan: "free",
        redirectTo: "https://malicious.example",
      }),
    })

    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?intent=signup&plan=free&redirectTo=%2Fdashboard"
    )
  })
})
