import {
  getExpenseCopilotAlerts,
  getExpensePolicyConfigForCompany,
  type ExpensePolicyConfigView,
} from "@/app/actions/expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseReviewPanelSection } from "./components/expense-review-panel-section";
import type { Category } from "./expenses-client-types";

interface ExpenseReviewSectionProps {
  categories: Category[];
  isAdmin: boolean;
}

const DEFAULT_POLICY_CONFIG: ExpensePolicyConfigView = {
  globalThresholdUsd: 1000,
  categoryThresholds: {},
};

export async function ExpenseReviewSection({
  categories,
  isAdmin,
}: ExpenseReviewSectionProps): Promise<React.JSX.Element> {
  const [copilotAlertsResult, policyResult] = await Promise.all([
    getExpenseCopilotAlerts(),
    isAdmin ? getExpensePolicyConfigForCompany() : Promise.resolve(null),
  ]);
  const initialAlerts = copilotAlertsResult.success ? copilotAlertsResult.alerts : [];
  const initialPolicyConfig =
    policyResult?.success ? policyResult.config : DEFAULT_POLICY_CONFIG;

  return (
    <ExpenseReviewPanelSection
      categories={categories}
      initialAlerts={initialAlerts}
      initialPolicyConfig={initialPolicyConfig}
      isAdmin={isAdmin}
    />
  );
}

export function ExpenseReviewSectionSkeleton({
  isAdmin,
}: Pick<ExpenseReviewSectionProps, "isAdmin">): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Card className="border-amber-300/60">
        <CardContent className="flex min-h-[5.75rem] flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <span className="font-medium">Expense Monitor</span>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-[22rem] rounded" />
          </div>

          <Skeleton className="h-9 w-28 rounded-md" />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Policy Threshold Controls</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure the amount limits used by expense monitor policy risk detection.
                </p>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <p className="text-sm font-medium">Global Threshold (USD)</p>
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="flex items-end">
                <Skeleton className="h-10 w-28 rounded-md" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <p className="text-sm font-medium">Category Override</p>
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Threshold (USD)</p>
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="flex items-end">
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
