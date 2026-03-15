import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("seo routes", () => {
  const originalEnv = {
    APP_URL: process.env.APP_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  };

  beforeEach(() => {
    process.env.APP_URL = "https://spendscope.app";
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterAll(() => {
    process.env.APP_URL = originalEnv.APP_URL;
    process.env.NEXTAUTH_URL = originalEnv.NEXTAUTH_URL;
    process.env.VERCEL_ENV = originalEnv.VERCEL_ENV;
    process.env.VERCEL_URL = originalEnv.VERCEL_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = originalEnv.VERCEL_PROJECT_PRODUCTION_URL;
  });

  it("keeps robots and sitemap on the configured canonical origin", () => {
    const robotsConfig = robots();
    const sitemapEntries = sitemap();

    expect(robotsConfig.host).toBe("https://spendscope.app");
    expect(robotsConfig.sitemap).toBe("https://spendscope.app/sitemap.xml");
    expect(sitemapEntries).toHaveLength(1);
    expect(sitemapEntries[0]?.url).toBe("https://spendscope.app");
  });
});
