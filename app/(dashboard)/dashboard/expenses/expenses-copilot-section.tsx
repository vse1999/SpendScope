import {
  getExpenseCopilotAlerts,
  getExpensePolicyConfigForCompany,
  type ExpensePolicyConfigView,
} from "@/app/actions/expenses";
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
