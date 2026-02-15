import { auth } from "@/auth";
import { getCachedUserCompany } from "@/lib/queries/get-user-company";
import {
  getCategories,
  getExpenseCopilotAlerts,
  getExpensePolicyConfigForCompany,
  getExpensesWithFilters,
  getExpensesSummary,
} from "@/app/actions/expenses";
import { parseMultiSort, type MultiSortConfig } from "@/lib/expense-sorting";
import { ExpensesClient } from "./expenses-client";

export const metadata = {
  title: "Expenses | SpendScope",
  description: "Manage and analyze your expenses",
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
  // session.user and company are guaranteed by (dashboard)/layout.tsx guards
  const session = await auth();
  const user = session!.user!

  // Get companyId from database (not session, to handle stale JWT)
  const userCompanyResult = await getCachedUserCompany();
  const companyId = userCompanyResult.company!.id;

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
  const [expensesResult, categoriesResult, summaryResult, copilotAlertsResult, policyResult] = await Promise.all([
    getExpensesWithFilters(filters, { cursor: params.cursor }),
    getCategories(),
    getExpensesSummary(filters),
    getExpenseCopilotAlerts(),
    getExpensePolicyConfigForCompany(),
  ]);

  const expenses = "error" in expensesResult ? { items: [], pageInfo: { endCursor: null } } : expensesResult;
  const categories = "error" in categoriesResult ? [] : categoriesResult;
  const summaryRaw = "error" in summaryResult ? { count: 0, totalAmount: 0 } : summaryResult;
  const summary = {
    count: summaryRaw.count,
    total: summaryRaw.totalAmount,
  };
  const copilotAlerts = copilotAlertsResult.success ? copilotAlertsResult.alerts : [];
  const policyConfig = policyResult.success
    ? policyResult.config
    : { globalThresholdUsd: 1000, categoryThresholds: {} };

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
      currentUserId={user.id}
      companyId={companyId!}
      isAdmin={user.role === "ADMIN"}
      initialCopilotAlerts={copilotAlerts}
      initialPolicyConfig={policyConfig}
    />
  );
}
