import { defineConfig, devices } from "@playwright/test";

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const playwrightBaseUrl = getOptionalEnv("PLAYWRIGHT_BASE_URL");
const nextAuthUrl = getOptionalEnv("NEXTAUTH_URL");
const authUrl = getOptionalEnv("AUTH_URL");
const appUrl = getOptionalEnv("APP_URL");
const configuredAuthUrl = nextAuthUrl ?? authUrl;
const baseURL = playwrightBaseUrl ?? configuredAuthUrl ?? "http://localhost:3000";

function getOrigin(url: string): string {
  return new URL(url).origin;
}

if (playwrightBaseUrl && configuredAuthUrl) {
  const playwrightOrigin = getOrigin(playwrightBaseUrl);
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
  webServer: playwrightBaseUrl
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          NEXTAUTH_URL: nextAuthUrl ?? baseURL,
          AUTH_URL: authUrl ?? nextAuthUrl ?? baseURL,
          APP_URL: appUrl ?? baseURL,
        },
      },
});
