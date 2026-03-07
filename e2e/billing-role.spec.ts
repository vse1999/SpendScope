import { expect, test } from "@playwright/test";
import { loginAsSeededMember } from "./helpers/session";

test.describe("Billing Role Guards", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededMember(page);
  });

  test("shows read-only billing view for non-admin members", async ({ page }) => {
    await page.goto("/dashboard/billing");

    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expect(page.getByText("Only admins can manage billing").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).not.toBeVisible();
  });
});
