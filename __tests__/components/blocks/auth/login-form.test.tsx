import { renderToStaticMarkup } from "react-dom/server"

jest.mock("@/components/blocks/auth/oauth-buttons", () => ({
  GoogleSignInButton: () => null,
  GitHubSignInButton: () => null,
}))

import { LoginForm } from "@/components/blocks/auth/login-form"

describe("LoginForm", () => {
  it("renders the current auth guidance without legal-link copy", () => {
    const html = renderToStaticMarkup(<LoginForm />)

    expect(html).toContain("SpendScope")
    expect(html).toContain("Secure authentication")
    expect(html).toContain("For returning finance leads, ops owners, and teammates")
    expect(html).not.toContain('href="/terms"')
    expect(html).not.toContain('href="/privacy"')
  })
})
