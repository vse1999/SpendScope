import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserCompany } from "@/app/actions/companies";
import { getCategories, getExpensesWithFilters, getExpensesSummary } from "@/app/actions/expenses";
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
  }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Check company
  const userCompanyResult = await getUserCompany();

  if (!userCompanyResult.hasCompany) {
    redirect("/onboarding");
  }

  const companyId = userCompanyResult.company?.id;
  const isAdmin = session.user.role === "ADMIN";

  // Parse search params
  const params = await searchParams;
  const filters = {
    cursor: params.cursor,
    dateFrom: params.from ? new Date(params.from) : undefined,
    dateTo: params.to ? new Date(params.to) : undefined,
    categoryIds: params.category ? params.category.split(",") : undefined,
    amountMin: params.minAmount ? parseFloat(params.minAmount) : undefined,
    amountMax: params.maxAmount ? parseFloat(params.maxAmount) : undefined,
    search: params.search,
  };

  // Fetch data in parallel
  const [expensesResult, categoriesResult, summaryResult] = await Promise.all([
    getExpensesWithFilters(filters),
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
      isAdmin={isAdmin}
      currentUserId={session.user.id}
      companyId={companyId!}
    />
  );
}
