import { defineConfig, devices } from "@playwright/test";

const configuredAuthUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? configuredAuthUrl ?? "http://localhost:3000";

function getOrigin(url: string): string {
  return new URL(url).origin;
}

if (process.env.PLAYWRIGHT_BASE_URL && configuredAuthUrl) {
  const playwrightOrigin = getOrigin(process.env.PLAYWRIGHT_BASE_URL);
  const authOrigin = getOrigin(configuredAuthUrl);

  if (playwrightOrigin !== authOrigin) {
    throw new Error(
      `Origin mismatch: PLAYWRIGHT_BASE_URL (${playwrightOrigin}) must match NEXTAUTH_URL/AUTH_URL (${authOrigin})`
    );
  }
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          ENABLE_TEST_ENDPOINTS: process.env.ENABLE_TEST_ENDPOINTS ?? "true",
          E2E_LOGIN_BYPASS: process.env.E2E_LOGIN_BYPASS ?? "true",
          E2E_LOGIN_TOKEN: process.env.E2E_LOGIN_TOKEN ?? "test",
          NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? baseURL,
          AUTH_URL: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? baseURL,
          APP_URL: process.env.APP_URL ?? baseURL,
        },
      },
});
