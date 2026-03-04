import {
  getExpenseCopilotAlerts,
  getExpensePolicyConfigForCompany,
} from "@/app/actions/expenses";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseCopilotPanelSection } from "./components/expense-copilot-panel-section";
import type { Category } from "./expenses-client-types";

interface ExpensesCopilotSectionProps {
  categories: Category[];
  isAdmin: boolean;
}

const DEFAULT_POLICY_CONFIG = {
  globalThresholdUsd: 1000,
  categoryThresholds: {},
};

export async function ExpensesCopilotSection({
  categories,
  isAdmin,
}: ExpensesCopilotSectionProps): Promise<React.JSX.Element> {
  const [copilotAlertsResult, policyResult] = await Promise.all([
    getExpenseCopilotAlerts(),
    getExpensePolicyConfigForCompany(),
  ]);
  const initialCopilotAlerts = copilotAlertsResult.success ? copilotAlertsResult.alerts : [];
  const initialPolicyConfig = policyResult.success
    ? policyResult.config
    : DEFAULT_POLICY_CONFIG;

  return (
    <ExpenseCopilotPanelSection
      categories={categories}
      initialCopilotAlerts={initialCopilotAlerts}
      initialPolicyConfig={initialPolicyConfig}
      isAdmin={isAdmin}
    />
  );
}

export function ExpensesCopilotSectionSkeleton({
  isAdmin,
}: Pick<ExpensesCopilotSectionProps, "isAdmin">): React.JSX.Element {
  return (
    <>
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-full max-w-[30rem]" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-full max-w-[33rem]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}
    </>
  );
}
