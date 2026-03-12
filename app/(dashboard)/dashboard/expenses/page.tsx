import type { Metadata } from "next";
import { requireDashboardRequestContext } from "@/lib/dashboard/request-context";
import { isBillingEnabled } from "@/lib/stripe/config";
import {
  getCategories,
  getExpensesWithFilters,
  getExpensesSummary,
} from "@/app/actions/expenses";
import { parseMultiSort, type MultiSortConfig } from "@/lib/expense-sorting";
import { ExpenseReviewSection } from "./expenses-copilot-section";
import { ExpensesClient } from "./expenses-client";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Manage and analyze your expenses",
  openGraph: {
    images: ["/api/og?variant=expenses"],
  },
  twitter: {
    images: ["/api/twitter?variant=expenses"],
  },
};

interface ExpensesPageProps {
  searchParams: Promise<{
    cursor?: string;
    from?: string;
    to?: string;
    category?: string;
    minAmount?: string;
    maxAmount?: string;
    search?: string;
    sort?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps): Promise<React.JSX.Element> {
  const { user } = await requireDashboardRequestContext();
  const isAdmin = user.role === "ADMIN";
  const billingEnabled = isBillingEnabled();

  // Parse search params
  const params = await searchParams;

  // Parse multi-column sort configuration from URL
  // Format: ?sort=date:desc,amount:asc,user:asc
  const sortConfig: MultiSortConfig = parseMultiSort(params.sort);

  const filters = {
    dateFrom: params.from ? new Date(params.from) : undefined,
    dateTo: params.to ? new Date(params.to) : undefined,
    categoryIds: params.category ? params.category.split(",") : undefined,
    amountMin: params.minAmount ? parseFloat(params.minAmount) : undefined,
    amountMax: params.maxAmount ? parseFloat(params.maxAmount) : undefined,
    search: params.search,
    sort: sortConfig,
  };

  // Fetch data in parallel
  const [expensesResult, categoriesResult, summaryResult] = await Promise.all([
    getExpensesWithFilters(filters, { cursor: params.cursor }),
    getCategories(),
    getExpensesSummary(filters),
  ]);

  const expenses = "error" in expensesResult ? { items: [], pageInfo: { endCursor: null } } : expensesResult;
  const categories = "error" in categoriesResult ? [] : categoriesResult;
  const summaryRaw = "error" in summaryResult ? { count: 0, totalAmount: 0 } : summaryResult;
  const summary = {
    count: summaryRaw.count,
    total: summaryRaw.totalAmount,
  };
  // Convert amount strings to numbers for client
  const normalizedExpenses = expenses.items.map(item => ({
    ...item,
    amount: parseFloat(item.amount),
  }));

  return (
    <ExpensesClient
      initialExpenses={normalizedExpenses}
      initialNextCursor={expenses.pageInfo.endCursor}
      categories={categories}
      summary={summary}
      filters={filters}
      initialSortConfig={sortConfig}
      isAdmin={isAdmin}
      billingEnabled={billingEnabled}
    >
      <ExpenseReviewSection categories={categories} isAdmin={isAdmin} />
    </ExpensesClient>
  );
}
