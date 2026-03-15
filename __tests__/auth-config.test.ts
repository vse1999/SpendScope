describe("authConfig trustHost policy", () => {
  const originalEnv = process.env;

  function setNodeEnv(value: string): void {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = value;
  }

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.TRUST_HOST;
    delete process.env.VERCEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("trusts hosts in development", async () => {
    setNodeEnv("development");

    const { authConfig } = await import("../auth.config");

    expect(authConfig.trustHost).toBe(true);
  });

  it("trusts hosts in test", async () => {
    setNodeEnv("test");

    const { authConfig } = await import("../auth.config");

    expect(authConfig.trustHost).toBe(true);
  });

  it("trusts hosts on vercel deployments", async () => {
    setNodeEnv("production");
    process.env.VERCEL = "1";

    const { authConfig } = await import("../auth.config");

    expect(authConfig.trustHost).toBe(true);
  });

  it("trusts hosts when explicitly opted in", async () => {
    setNodeEnv("production");
    process.env.TRUST_HOST = "true";

    const { authConfig } = await import("../auth.config");

    expect(authConfig.trustHost).toBe(true);
  });

  it("fails closed in production without explicit trust", async () => {
    setNodeEnv("production");

    const { authConfig } = await import("../auth.config");

    expect(authConfig.trustHost).toBe(false);
  });
});
