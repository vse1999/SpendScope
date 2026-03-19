const mockUserFindUnique = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}))

describe("demo auth helpers", () => {
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

  function loadDemoAuth(): typeof import("../auth") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../auth") as typeof import("../auth")
  }

  it("returns null when demo access is disabled", async (): Promise<void> => {
    const demoAuth = loadDemoAuth()

    const result = await demoAuth.authorizeDemoCredentials({ email: "alex.johnson@democorp.com" })

    expect(result).toBeNull()
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it("returns null for non-demo credentials", async (): Promise<void> => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true"

    const demoAuth = loadDemoAuth()
    const result = await demoAuth.authorizeDemoCredentials({ email: "someone@example.com" })

    expect(result).toBeNull()
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it("returns the seeded demo user when the feature flag is enabled", async (): Promise<void> => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true"
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "alex.johnson@democorp.com",
      name: "Alex Johnson",
      companyId: "company-1",
    })

    const demoAuth = loadDemoAuth()
    const result = await demoAuth.authorizeDemoCredentials({
      email: "  Alex.Johnson@DemoCorp.com  ",
    })

    expect(result).toEqual({
      id: "user-1",
      email: "alex.johnson@democorp.com",
      name: "Alex Johnson",
    })
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: "alex.johnson@democorp.com" },
      select: {
        id: true,
        email: true,
        name: true,
        companyId: true,
      },
    })
  })

  it("recognizes the demo provider id", (): void => {
    const demoAuth = loadDemoAuth()

    expect(demoAuth.isDemoProvider("demo-guest")).toBe(true)
    expect(demoAuth.isDemoProvider("google")).toBe(false)
  })
})
