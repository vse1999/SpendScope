import { revalidateTag } from "next/cache";

export const COMPANY_CACHE_TTL_SECONDS = {
  analytics: 300,
  categories: 86400,
  dashboard: 60,
} as const;

export interface CompanyReadModelCacheTags {
  analytics: string;
  categories: string;
  dashboard: string;
  expenses: string;
}

export function getCompanyReadModelCacheTags(
  companyId: string
): CompanyReadModelCacheTags {
  const prefix = `company:${companyId}`;

  return {
    analytics: `${prefix}:analytics`,
    categories: `${prefix}:categories`,
    dashboard: `${prefix}:dashboard`,
    expenses: `${prefix}:expenses`,
  };
}

export function invalidateCompanyExpenseReadModels(companyId: string): void {
  const tags = getCompanyReadModelCacheTags(companyId);
  revalidateTag(tags.expenses, "max");
  revalidateTag(tags.dashboard, "max");
  revalidateTag(tags.analytics, "max");
}

export function invalidateCompanyCategoryReadModels(companyId: string): void {
  const tags = getCompanyReadModelCacheTags(companyId);
  revalidateTag(tags.categories, "max");
  revalidateTag(tags.dashboard, "max");
  revalidateTag(tags.analytics, "max");
}
