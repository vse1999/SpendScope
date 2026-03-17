import type { Metadata } from "next";
import { requireDashboardRequestContext } from "@/lib/dashboard/request-context";
import { isBillingEnabled } from "@/lib/stripe/config";
import {
  getCategories,
  getExpensesWithFilters,
  getExpensesSummary,
} from "@/app/actions/expenses";
import { parseMultiSort, type MultiSortConfig } from "@/lib/expense-sorting";
import { ExpenseInitialLoadErrorState } from "./components/expense-initial-load-error-state";
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

  const expensesError = "error" in expensesResult ? expensesResult.error : undefined;
  const categoriesError = "error" in categoriesResult ? categoriesResult.error : undefined;
  const summaryError = "error" in summaryResult ? summaryResult.error : undefined;
  const loadIssues = [
    expensesError ? { label: "Expense list", message: expensesError } : null,
    categoriesError ? { label: "Categories", message: categoriesError } : null,
    summaryError ? { label: "Summary totals", message: summaryError } : null,
  ].filter((issue): issue is { label: string; message: string } => issue !== null);

  if (loadIssues.length > 0) {
    const retrySearchParams = new URLSearchParams();

    if (params.cursor) {
      retrySearchParams.set("cursor", params.cursor);
    }
    if (params.from) {
      retrySearchParams.set("from", params.from);
    }
    if (params.to) {
      retrySearchParams.set("to", params.to);
    }
    if (params.category) {
      retrySearchParams.set("category", params.category);
    }
    if (params.minAmount) {
      retrySearchParams.set("minAmount", params.minAmount);
    }
    if (params.maxAmount) {
      retrySearchParams.set("maxAmount", params.maxAmount);
    }
    if (params.search) {
      retrySearchParams.set("search", params.search);
    }
    if (params.sort) {
      retrySearchParams.set("sort", params.sort);
    }

    const retryHref = retrySearchParams.size > 0
      ? `/dashboard/expenses?${retrySearchParams.toString()}`
      : "/dashboard/expenses";

    return <ExpenseInitialLoadErrorState issues={loadIssues} retryHref={retryHref} />;
  }

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
