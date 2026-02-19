import { buildMultiOrderBy } from "@/lib/expenses/action-helpers";

describe("buildMultiOrderBy", () => {
  it("builds orderBy for scalar sort fields and appends id tiebreaker", () => {
    const orderBy = buildMultiOrderBy([
      { field: "date", direction: "desc" },
      { field: "amount", direction: "asc" },
    ]);

    expect(orderBy).toEqual([
      { date: "desc" },
      { amount: "asc" },
      { id: "asc" },
    ]);
  });

  it("supports relation sorts (category/user) and appends id tiebreaker", () => {
    const orderBy = buildMultiOrderBy([
      { field: "category", direction: "asc" },
      { field: "user", direction: "desc" },
    ]);

    expect(orderBy).toEqual([
      { category: { name: "asc" } },
      { user: { name: "desc" } },
      { user: { email: "desc" } },
      { id: "asc" },
    ]);
  });
});
