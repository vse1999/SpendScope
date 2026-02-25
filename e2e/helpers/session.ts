import { expect, Page } from "@playwright/test";

const TEST_LOGOUT_PATH = "/api/test-logout";

export async function loginAsSeededAdmin(page: Page): Promise<void> {
  const token = process.env.E2E_LOGIN_TOKEN ?? "test";
  const query = new URLSearchParams({ seed: "1" });
  query.set("token", token);

  await page.goto(`/api/test-login?${query.toString()}`);
  await expect(page).toHaveURL(/\/dashboard\/expenses/);
}

export async function logoutViaTestEndpoint(page: Page): Promise<void> {
  await page.goto(TEST_LOGOUT_PATH);
  await expect(page).toHaveURL(/\/login/);

  // Ensure late in-flight responses cannot keep the authenticated session alive.
  await page.waitForLoadState("networkidle");
  await page.context().clearCookies();

  await page.goto("/dashboard/expenses");
  await expect(page).toHaveURL(/\/login/);
}
