import { expect, test } from "@playwright/test";
import { loginAsSeededAdmin } from "./helpers/session";

test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededAdmin(page);
  });

  test("loads dashboard and navigates core sections", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Total Expenses")).toBeVisible();
    await expect(page.getByText("Recent Expenses")).toBeVisible();

    await page.getByRole("link", { name: "Analytics" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/analytics/);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

    await page.getByRole("link", { name: "Expenses" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/expenses/);
    await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible();

    await page.getByRole("link", { name: "Team" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/team/);
    await expect(page.getByRole("heading", { name: "Team Members" })).toBeVisible();

    await page.getByRole("link", { name: "Billing" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/billing/);
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();

    await page.getByRole("link", { name: "Settings" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Account Overview")).toBeVisible();
  });
});
