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

  await page.getByRole("link", { name: "Explore Product" }).click();

  await expect(page).toHaveURL(/#product$/);
  await expect(
    page.getByRole("heading", { name: /Analytics that drive better decisions/i })
  ).toBeInViewport();

  await page.getByRole("link", { name: "Explore Product" }).click();
  await expect(
    page.getByRole("heading", { name: /Analytics that drive better decisions/i })
  ).toBeInViewport();

  const pricingSection = page.locator("#pricing");

  await pricingSection.getByRole("link", { name: "Get Started Free" }).click();
  await expect(page).toHaveURL(
    /\/login\?intent=signup&plan=free&redirectTo=%2Fonboarding%3FredirectTo%3D%252Fdashboard/
  );

  await page.goto("/");
  await pricingSection.getByRole("link", { name: "Start Pro" }).click();
  await expect(page).toHaveURL(
    /\/login\?intent=signup&plan=pro&redirectTo=%2Fonboarding%3FredirectTo%3D%252Fdashboard%252Fbilling%26plan%3Dpro/
  );
});
