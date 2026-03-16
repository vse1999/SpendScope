import { expect, test } from "@playwright/test";
import { loginAsSeededAdmin } from "./helpers/session";

test.describe("Analytics Flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededAdmin(page);
  });

  test("renders analytics and supports range + csv export", async ({ page }) => {
    await page.goto("/dashboard/analytics");

    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("Total Spent")).toBeVisible();
    await expect(page.getByText("Average Expense")).toBeVisible();
    await expect(page.getByText("Active Members")).toBeVisible();
    await expect(page.getByText("Monthly Spending Trend")).toBeVisible();
    await expect(page.getByText("Spending by Category")).toBeVisible();

    await page.getByRole("button", { name: "Last 90 days" }).click();
    await page.getByRole("menuitem", { name: "Last 30 days" }).click();
    await expect(page).toHaveURL(/days=30/);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: "Export as CSV" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("analytics");
  });

  test("keeps the committed range and URL unchanged when a refresh fails", async ({ page }) => {
    await page.goto("/dashboard/analytics");

    await page.route("**/api/analytics?days=30", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to load analytics data" }),
      });
    });

    await page.getByRole("button", { name: "Last 90 days" }).click();
    await page.getByRole("menuitem", { name: "Last 30 days" }).click();

    await expect(page.getByText("Failed to load analytics data")).toBeVisible();
    await expect(page.getByRole("button", { name: "Last 90 days" })).toBeVisible();
    await expect(page).not.toHaveURL(/days=30/);
  });
});
