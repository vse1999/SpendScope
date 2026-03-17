import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

jest.mock("@/components/blocks/auth/oauth-buttons", () => ({
  GoogleSignInButton: () => createElement("button", { type: "button" }, "Continue with Google"),
  GitHubSignInButton: () => createElement("button", { type: "button" }, "Continue with GitHub"),
}))

import SignupPage from "@/app/signup/page"

describe("SignupPage", () => {
  it("renders a workspace creation screen that continues into onboarding", async () => {
    const element = await SignupPage({
      searchParams: Promise.resolve({
        plan: "pro",
        redirectTo: "/onboarding?redirectTo=%2Fdashboard%2Fbilling&plan=pro",
      }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain("Create a workspace for finance, ops, and team spend review")
    expect(html).toContain("Continue with Google")
    expect(html).toContain("Continue with GitHub")
    expect(html).toContain("Pro workspace setup")
  })

  it("uses a safe fallback when redirect target is unsafe", async () => {
    const element = await SignupPage({
      searchParams: Promise.resolve({
        plan: "free",
        redirectTo: "https://malicious.example",
      }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain("/login?redirectTo=%2Fdashboard")
    expect(html).toContain("Free workspace setup")
  })
})
