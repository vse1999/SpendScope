describe("stripe config safety guard", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_ENABLE_BILLING
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    delete process.env.ALLOW_LIVE_STRIPE_KEYS
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function loadConfig(): typeof import("../config") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../config") as typeof import("../config")
  }

  it("disables billing when feature flag is off", () => {
    process.env.NEXT_PUBLIC_ENABLE_BILLING = "false"
    process.env.STRIPE_SECRET_KEY = "sk_test_123"
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123"

    const config = loadConfig()
    expect(config.STRIPE_ENABLED).toBe(false)
    expect(config.isBillingEnabled()).toBe(false)
  })

  it("enables billing for test keys when feature flag is on", () => {
    process.env.NEXT_PUBLIC_ENABLE_BILLING = "true"
    process.env.STRIPE_SECRET_KEY = "sk_test_123"
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123"

    const config = loadConfig()
    expect(config.STRIPE_ENABLED).toBe(true)
    expect(config.isBillingEnabled()).toBe(true)
  })

  it("disables billing for live keys when override is not set", () => {
    process.env.NEXT_PUBLIC_ENABLE_BILLING = "true"
    process.env.STRIPE_SECRET_KEY = "sk_live_123"
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_123"

    const config = loadConfig()
    expect(config.STRIPE_ENABLED).toBe(false)
    expect(config.isBillingEnabled()).toBe(false)
  })

  it("enables billing for live keys only with explicit override", () => {
    process.env.NEXT_PUBLIC_ENABLE_BILLING = "true"
    process.env.STRIPE_SECRET_KEY = "sk_live_123"
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_123"
    process.env.ALLOW_LIVE_STRIPE_KEYS = "true"

    const config = loadConfig()
    expect(config.STRIPE_ENABLED).toBe(true)
    expect(config.isBillingEnabled()).toBe(true)
  })

  it("disables billing when key modes are mixed", () => {
    process.env.NEXT_PUBLIC_ENABLE_BILLING = "true"
    process.env.STRIPE_SECRET_KEY = "sk_test_123"
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_123"
    process.env.ALLOW_LIVE_STRIPE_KEYS = "true"

    const config = loadConfig()
    expect(config.STRIPE_ENABLED).toBe(false)
    expect(config.isBillingEnabled()).toBe(false)
  })
})
