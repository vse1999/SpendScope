"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExpensePolicyConfigView } from "@/app/actions/expenses";
import type { Category } from "../expenses-client-types";
import { useExpensePolicyControlsState } from "../use-expense-policy-controls-state";
import { ExpensePolicyControlsPanel } from "./expense-policy-controls-panel";

interface ExpensePolicyControlsCardProps {
  categories: Category[];
  initialPolicyConfig: ExpensePolicyConfigView;
}

export function ExpensePolicyControlsCard({
  categories,
  initialPolicyConfig,
}: ExpensePolicyControlsCardProps): React.JSX.Element {
  const {
    categoryPolicyOverrides,
    globalPolicyThreshold,
    handleDeleteCategoryPolicyThreshold,
    handleSaveCategoryPolicyThreshold,
    handleSaveGlobalPolicyThreshold,
    handleSelectedPolicyCategoryChange,
    isRefreshing,
    isSavingCategoryPolicy,
    isSavingGlobalPolicy,
    selectedPolicyCategoryId,
    selectedPolicyThreshold,
    setGlobalPolicyThreshold,
    setSelectedPolicyThreshold,
  } = useExpensePolicyControlsState({
    categories,
    initialPolicyConfig,
  });

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Policy Threshold Controls</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure the amount limits used by expense monitor policy risk detection.
            </p>
          </div>
          {isRefreshing && <Badge variant="outline">Syncing</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        <ExpensePolicyControlsPanel
          categories={categories}
          categoryPolicyOverrides={categoryPolicyOverrides}
          globalPolicyThreshold={globalPolicyThreshold}
          isRefreshing={isRefreshing}
          isSavingCategoryPolicy={isSavingCategoryPolicy}
          isSavingGlobalPolicy={isSavingGlobalPolicy}
          onDeleteCategoryPolicyThreshold={handleDeleteCategoryPolicyThreshold}
          onGlobalPolicyThresholdChange={setGlobalPolicyThreshold}
          onSaveCategoryPolicyThreshold={handleSaveCategoryPolicyThreshold}
          onSaveGlobalPolicyThreshold={handleSaveGlobalPolicyThreshold}
          onSelectedPolicyCategoryChange={handleSelectedPolicyCategoryChange}
          onSelectedPolicyThresholdChange={setSelectedPolicyThreshold}
          selectedPolicyCategoryId={selectedPolicyCategoryId}
          selectedPolicyThreshold={selectedPolicyThreshold}
        />
      </CardContent>
    </Card>
  );
}
