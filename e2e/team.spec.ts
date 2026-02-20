import { expect, test } from "@playwright/test";
import { loginAsSeededAdmin } from "./helpers/session";

test.describe("Team Flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededAdmin(page);
  });

  test("renders members and role audit sections", async ({ page }) => {
    await page.goto("/dashboard/team");

    const membersTable = page.getByRole("table").first();

    await expect(page.getByRole("heading", { name: "Team Members" })).toBeVisible();
    await expect(membersTable.getByText("e2e-admin@spendscope.local")).toBeVisible();
    await expect(membersTable.getByText("e2e-member@spendscope.local")).toBeVisible();
    await expect(page.getByText("Role Change Audit Log")).toBeVisible();
  });

  test("allows admin to promote and demote a member", async ({ page }) => {
    await page.goto("/dashboard/team");

    const memberEmail = "e2e-member@spendscope.local";
    const memberRow = page.locator("table tbody tr", { hasText: memberEmail }).first();

    await memberRow.getByRole("button", { name: "Actions" }).click();
    await page.getByRole("menuitem", { name: "Promote to Admin" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(memberRow).toContainText("ADMIN");

    await memberRow.getByRole("button", { name: "Actions" }).click();
    await page.getByRole("menuitem", { name: "Change to Member" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(memberRow).toContainText("MEMBER");
  });
});
