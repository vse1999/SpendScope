const mockRevalidateTag = jest.fn();

jest.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

import {
  getCompanyReadModelCacheTags,
  invalidateCompanyCategoryReadModels,
  invalidateCompanyExpenseReadModels,
} from "@/lib/cache/company-read-model-cache";

describe("company read model cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds tenant-scoped cache tags", () => {
    const tags = getCompanyReadModelCacheTags("company-123");

    expect(tags).toEqual({
      analytics: "company:company-123:analytics",
      categories: "company:company-123:categories",
      dashboard: "company:company-123:dashboard",
      expenses: "company:company-123:expenses",
    });
  });

  it("invalidates expense read models", () => {
    invalidateCompanyExpenseReadModels("company-123");

    expect(mockRevalidateTag).toHaveBeenCalledWith("company:company-123:expenses", "max");
    expect(mockRevalidateTag).toHaveBeenCalledWith("company:company-123:dashboard", "max");
    expect(mockRevalidateTag).toHaveBeenCalledWith("company:company-123:analytics", "max");
  });

  it("invalidates category read models", () => {
    invalidateCompanyCategoryReadModels("company-123");

    expect(mockRevalidateTag).toHaveBeenCalledWith("company:company-123:categories", "max");
    expect(mockRevalidateTag).toHaveBeenCalledWith("company:company-123:dashboard", "max");
    expect(mockRevalidateTag).toHaveBeenCalledWith("company:company-123:analytics", "max");
  });
});
