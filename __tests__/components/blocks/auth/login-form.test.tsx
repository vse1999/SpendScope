import { renderToStaticMarkup } from "react-dom/server"

jest.mock("@/components/blocks/auth/oauth-buttons", () => ({
  GoogleSignInButton: () => null,
  GitHubSignInButton: () => null,
}))

import { LoginForm } from "@/components/blocks/auth/login-form"

describe("LoginForm", () => {
  it("renders real legal links instead of placeholder copy", () => {
    const html = renderToStaticMarkup(<LoginForm />)

    expect(html).toContain('href="/terms"')
    expect(html).toContain('href="/privacy"')
  })
})
