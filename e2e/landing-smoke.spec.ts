import { expect, test } from "@playwright/test";

test("landing page renders primary marketing shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(
    /SpendScope \| Modern Expense Intelligence for Teams/
  );

  await expect(
    page.getByRole("heading", {
      name: /Expense control for teams that need speed, clarity, and confidence/i,
    })
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Start Free" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
});
