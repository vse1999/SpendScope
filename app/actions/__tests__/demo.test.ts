const mockSignIn = jest.fn()
const mockFindDemoGuestUser = jest.fn()

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(url)
  }
}

class DemoActionAuthError extends Error {
  type = "CredentialsSignin" as const
}

jest.mock("@/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

jest.mock("@/lib/demo/auth", () => ({
  findDemoGuestUser: (...args: unknown[]) => mockFindDemoGuestUser(...args),
}))

jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url)
  },
}))

describe("signInAsDemo", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_ENABLE_DEMO
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function loadDemoAction(): typeof import("../demo") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../demo") as typeof import("../demo")
  }

  function buildFormData(redirectTo?: string): FormData {
    const formData = new FormData()

    if (redirectTo) {
      formData.set("redirectTo", redirectTo)
    }

    return formData
  }

  it("redirects when demo access is disabled", async (): Promise<void> => {
    const { signInAsDemo } = loadDemoAction()

    await expect(signInAsDemo(buildFormData("/dashboard"))).rejects.toMatchObject({
      url: "/login?error=DemoDisabled",
    })
    expect(mockFindDemoGuestUser).not.toHaveBeenCalled()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it("redirects when the seeded demo user is unavailable", async (): Promise<void> => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true"
    mockFindDemoGuestUser.mockResolvedValue(null)

    const { signInAsDemo } = loadDemoAction()

    await expect(signInAsDemo(buildFormData("/dashboard"))).rejects.toMatchObject({
      url: "/login?error=DemoUnavailable",
    })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it("sanitizes redirect targets before calling signIn", async (): Promise<void> => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true"
    mockFindDemoGuestUser.mockResolvedValue({
      id: "user-1",
      email: "alex.johnson@democorp.com",
      name: "Alex Johnson",
      companyId: "company-1",
    })
    mockSignIn.mockResolvedValue(undefined)

    const { signInAsDemo } = loadDemoAction()
    await signInAsDemo(buildFormData("https://evil.example"))

    expect(mockSignIn).toHaveBeenCalledWith("demo-guest", {
      email: "alex.johnson@democorp.com",
      redirectTo: "/dashboard",
    })
  })

  it("redirects to a safe login error when Auth.js rejects the credentials flow", async (): Promise<void> => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true"
    mockFindDemoGuestUser.mockResolvedValue({
      id: "user-1",
      email: "alex.johnson@democorp.com",
      name: "Alex Johnson",
      companyId: "company-1",
    })
    mockSignIn.mockRejectedValue(new DemoActionAuthError())

    const { signInAsDemo } = loadDemoAction()

    await expect(signInAsDemo(buildFormData("/dashboard/expenses"))).rejects.toMatchObject({
      url: "/login?error=CredentialsSignin&redirectTo=%2Fdashboard%2Fexpenses",
    })
  })
})
