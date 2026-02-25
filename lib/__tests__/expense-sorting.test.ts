import {
  getNextSortConfig,
  parseMultiSort,
  type MultiSortConfig,
} from "@/lib/expense-sorting";

describe("expense sorting utilities", () => {
  describe("parseMultiSort", () => {
    it("returns default sort when input is missing or invalid", () => {
      expect(parseMultiSort(undefined)).toEqual([{ field: "date", direction: "desc" }]);
      expect(parseMultiSort("invalid:asc")).toEqual([{ field: "date", direction: "desc" }]);
    });

    it("parses valid fields and ignores duplicates", () => {
      expect(parseMultiSort("date:desc,amount:asc,amount:desc,user:asc")).toEqual([
        { field: "date", direction: "desc" },
        { field: "amount", direction: "asc" },
        { field: "user", direction: "asc" },
      ]);
    });
  });

  describe("getNextSortConfig", () => {
    it("uses single-column sorting on normal click", () => {
      const current: MultiSortConfig = [
        { field: "date", direction: "desc" },
        { field: "amount", direction: "asc" },
      ];

      expect(getNextSortConfig({ current, field: "amount", isShiftClick: false })).toEqual([
        { field: "amount", direction: "desc" },
      ]);

      expect(getNextSortConfig({ current, field: "user", isShiftClick: false })).toEqual([
        { field: "user", direction: "asc" },
      ]);
    });

    it("adds/toggles secondary sort on shift-click", () => {
      const current: MultiSortConfig = [{ field: "date", direction: "desc" }];

      expect(getNextSortConfig({ current, field: "amount", isShiftClick: true })).toEqual([
        { field: "date", direction: "desc" },
        { field: "amount", direction: "desc" },
      ]);

      expect(
        getNextSortConfig({
          current: [
            { field: "date", direction: "desc" },
            { field: "amount", direction: "desc" },
          ],
          field: "amount",
          isShiftClick: true,
        })
      ).toEqual([
        { field: "date", direction: "desc" },
        { field: "amount", direction: "asc" },
      ]);
    });
  });
});
