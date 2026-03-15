import { expect, test } from "@playwright/test";
import { loginAsSeededAdmin, logoutSeededUser } from "./helpers/session";

test.describe("Auth And Onboarding Guards", () => {
  test("redirects unauthenticated dashboard access to login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", {
        name: "SpendScope",
      })
    ).toBeVisible();
  });

  test("supports seeded auth bootstrap, onboarding guard, and logout", async ({ page }) => {
    await loginAsSeededAdmin(page);

    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/dashboard$/);

    await logoutSeededUser(page);
  });
});
