import { expect, test } from "@playwright/test";

test("landing page renders primary marketing shell", async ({ page }) => {
  await page.goto("/");

  const landingNavbar = page.locator("header");

  await expect(page).toHaveTitle(/Expense Control for Modern Teams \| SpendScope/);

  await expect(
    page.getByRole("heading", {
      name: /Keep team spend visible before month-end turns into a surprise/i,
    })
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Create Free Workspace" }).first()
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();

  const initialTop = await landingNavbar.evaluate((element) =>
    element.getBoundingClientRect().top
  );
  expect(initialTop).toBeLessThanOrEqual(0.5);

  await page.mouse.wheel(0, 900);
  await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
  const scrolledTop = await landingNavbar.evaluate((element) =>
    element.getBoundingClientRect().top
  );
  expect(scrolledTop).toBeLessThanOrEqual(0.5);

  await page.getByRole("link", { name: "Explore Product" }).click();

  await expect(page).toHaveURL(/#product$/);
  await expect(
    page.getByRole("heading", {
      name: /See where spend is drifting before it becomes a month-end surprise/i,
    })
  ).toBeInViewport();

  await page.getByRole("link", { name: "Explore Product" }).click();
  await expect(
    page.getByRole("heading", {
      name: /See where spend is drifting before it becomes a month-end surprise/i,
    })
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
