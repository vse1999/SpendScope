import { getSiteUrl, getSiteUrlObject } from "@/lib/seo/site-url";

describe("site-url", () => {
  const originalEnv = {
    APP_URL: process.env.APP_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  };

  beforeEach(() => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterAll(() => {
    process.env.APP_URL = originalEnv.APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = originalEnv.NEXT_PUBLIC_APP_URL;
    process.env.NEXTAUTH_URL = originalEnv.NEXTAUTH_URL;
    process.env.VERCEL_ENV = originalEnv.VERCEL_ENV;
    process.env.VERCEL_URL = originalEnv.VERCEL_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = originalEnv.VERCEL_PROJECT_PRODUCTION_URL;
  });

  it("prefers the explicit app origin", () => {
    process.env.APP_URL = "https://spendscope.app";
    process.env.NEXTAUTH_URL = "https://fallback.example";

    expect(getSiteUrl()).toBe("https://spendscope.app");
    expect(getSiteUrlObject().origin).toBe("https://spendscope.app");
  });

  it("uses the production Vercel origin when explicit urls are missing", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "spendscope.com";

    expect(getSiteUrl()).toBe("https://spendscope.com");
  });

  it("uses the preview Vercel origin for preview environments", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "preview-spendscope.vercel.app";

    expect(getSiteUrl()).toBe("https://preview-spendscope.vercel.app");
  });

  it("falls back to localhost when no deployment origin is configured", () => {
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("ignores invalid explicit origins and preserves the fallback chain", () => {
    process.env.APP_URL = "http://bad url";
    process.env.NEXTAUTH_URL = "still bad";

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
