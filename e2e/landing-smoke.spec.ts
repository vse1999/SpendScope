import { expect, test } from "@playwright/test";

test("landing page renders primary marketing shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Expense Control for Modern Teams \| SpendScope/);

  await expect(
    page.getByRole("heading", {
      name: /Expense control for teams that need speed, clarity, and confidence/i,
    })
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Create Free Workspace" }).first()
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
});
