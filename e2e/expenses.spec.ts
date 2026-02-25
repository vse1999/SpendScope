import { expect, test } from "@playwright/test";
import { loginAsSeededAdmin } from "./helpers/session";

test.describe("Expenses Flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededAdmin(page);
  });

  test("supports sorting and pagination", async ({ page }) => {
    await page.goto("/dashboard/expenses");

    await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible();
    await expect(page.getByText("Total Expenses")).toBeVisible();

    const rowsBeforeSort = await page.locator("table tbody tr").count();
    expect(rowsBeforeSort).toBeGreaterThan(0);

    await page.getByRole("columnheader", { name: "Amount" }).click();
    await expect(page.getByText("Sort by:")).toBeVisible();

    const loadMoreButton = page.getByRole("button", { name: "Load More" });
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();

      await expect
        .poll(async () => page.locator("table tbody tr").count(), {
          message: "expected more rows after loading additional expenses",
        })
        .toBeGreaterThan(rowsBeforeSort);
    }
  });

  test("supports add, filter, select, and bulk delete", async ({ page }) => {
    await page.goto("/dashboard/expenses");

    const uniqueDescription = `E2E Expense ${Date.now()}`;
    await page.getByRole("button", { name: "Add Expense" }).first().click();

    const addDialog = page.getByRole("dialog", { name: "Add Expense" });
    if ((await addDialog.count()) > 0) {
      await expect(addDialog).toBeVisible();
    }

    let formDialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("button", { name: "Save Expense" }) })
      .first();

    if (!(await formDialog.isVisible())) {
      await addDialog.getByRole("button", { name: "Add Expense" }).click();
      formDialog = page
        .getByRole("dialog")
        .filter({ has: page.getByRole("button", { name: "Save Expense" }) })
        .first();
    }

    await expect(formDialog).toBeVisible();
    await formDialog.getByLabel("Amount").fill("123.45");
    await formDialog.getByLabel("Description").fill(uniqueDescription);

    await formDialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Food" }).click();
    await formDialog.getByRole("button", { name: "Save Expense" }).click();

    await expect(formDialog).toBeHidden();
    await expect(page.getByText(uniqueDescription)).toBeVisible();

    await page.getByPlaceholder("Search descriptions...").fill(uniqueDescription);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(uniqueDescription)).toBeVisible();

    const createdExpenseRow = page.locator("table tbody tr", { hasText: uniqueDescription }).first();
    await createdExpenseRow.getByRole("checkbox").click();

    const bulkActionBar = page.locator("div", { hasText: "1 expense selected" }).first();
    await expect(bulkActionBar).toBeVisible();

    await bulkActionBar.getByRole("button", { name: "Delete" }).click();

    const deleteDialog = page.getByRole("dialog", { name: "Delete Expenses" });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(uniqueDescription)).not.toBeVisible();
  });
});
