"use client";

import type {
  ExpenseCopilotAlert,
  ExpensePolicyConfigView,
} from "@/app/actions/expenses";
import { ExpenseCopilotPanel } from "./expense-copilot-panel";
import type { Category } from "../expenses-client-types";
import { useExpensesCopilotPolicyState } from "../use-expenses-copilot-policy-state";

interface ExpenseCopilotPanelSectionProps {
  categories: Category[];
  initialCopilotAlerts: ExpenseCopilotAlert[];
  initialPolicyConfig: ExpensePolicyConfigView;
  isAdmin: boolean;
}

export function ExpenseCopilotPanelSection({
  categories,
  initialCopilotAlerts,
  initialPolicyConfig,
  isAdmin,
}: ExpenseCopilotPanelSectionProps): React.JSX.Element {
  const {
    copilotAlerts,
    resolvingAlerts,
    globalPolicyThreshold,
    selectedPolicyCategoryId,
    selectedPolicyThreshold,
    isSavingGlobalPolicy,
    isSavingCategoryPolicy,
    categoryPolicyOverrides,
    setGlobalPolicyThreshold,
    setSelectedPolicyThreshold,
    handleSelectedPolicyCategoryChange,
    resolveCopilotAlert,
    handleSaveGlobalPolicyThreshold,
    handleSaveCategoryPolicyThreshold,
    handleDeleteCategoryPolicyThreshold,
  } = useExpensesCopilotPolicyState({
    categories,
    initialCopilotAlerts,
    initialPolicyConfig,
  });

  return (
    <ExpenseCopilotPanel
      isAdmin={isAdmin}
      alerts={copilotAlerts}
      resolvingAlerts={resolvingAlerts}
      onResolveAlert={resolveCopilotAlert}
      globalPolicyThreshold={globalPolicyThreshold}
      onGlobalPolicyThresholdChange={setGlobalPolicyThreshold}
      onSaveGlobalPolicyThreshold={handleSaveGlobalPolicyThreshold}
      isSavingGlobalPolicy={isSavingGlobalPolicy}
      categories={categories}
      selectedPolicyCategoryId={selectedPolicyCategoryId}
      onSelectedPolicyCategoryChange={handleSelectedPolicyCategoryChange}
      selectedPolicyThreshold={selectedPolicyThreshold}
      onSelectedPolicyThresholdChange={setSelectedPolicyThreshold}
      onSaveCategoryPolicyThreshold={handleSaveCategoryPolicyThreshold}
      isSavingCategoryPolicy={isSavingCategoryPolicy}
      categoryPolicyOverrides={categoryPolicyOverrides}
      onDeleteCategoryPolicyThreshold={handleDeleteCategoryPolicyThreshold}
    />
  );
}
