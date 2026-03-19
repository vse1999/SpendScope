describe("demo config", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_ENABLE_DEMO
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function loadConfig(): typeof import("../config") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../config") as typeof import("../config")
  }

  it("keeps demo access disabled by default", () => {
    const config = loadConfig()

    expect(config.isDemoEnabled()).toBe(false)
    expect(config.DEMO_GUEST_EMAIL).toBe("alex.johnson@democorp.com")
  })

  it("enables demo access when the feature flag is on", () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO = "true"

    const config = loadConfig()

    expect(config.isDemoEnabled()).toBe(true)
    expect(config.DEMO_LOGIN_PROVIDER_ID).toBe("demo-guest")
    expect(config.DEMO_USER_EMAILS).toContain(config.DEMO_GUEST_EMAIL)
  })
})
