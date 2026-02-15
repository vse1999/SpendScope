"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  deleteCategoryExpensePolicyThreshold,
  resolveExpenseCopilotAlert,
  updateGlobalExpensePolicyThreshold,
  upsertCategoryExpensePolicyThreshold,
  type ExpenseCopilotAlert,
  type ExpensePolicyConfigView,
  type ResolveExpenseCopilotAction,
} from "@/app/actions/expenses";
import type { Category } from "./expenses-client-types";

interface UseExpensesCopilotPolicyStateArgs {
  categories: Category[];
  initialCopilotAlerts: ExpenseCopilotAlert[];
  initialPolicyConfig: ExpensePolicyConfigView;
}

interface UseExpensesCopilotPolicyStateResult {
  copilotAlerts: ExpenseCopilotAlert[];
  resolvingAlerts: Record<string, boolean>;
  globalPolicyThreshold: string;
  categoryPolicyThresholds: Record<string, string>;
  selectedPolicyCategoryId: string;
  selectedPolicyThreshold: string;
  isSavingGlobalPolicy: boolean;
  isSavingCategoryPolicy: boolean;
  categoryPolicyOverrides: Array<{ id: string; name: string; threshold: string }>;
  setGlobalPolicyThreshold: (value: string) => void;
  setSelectedPolicyThreshold: (value: string) => void;
  handleSelectedPolicyCategoryChange: (categoryId: string) => void;
  resolveCopilotAlert: (alertId: string, action: ResolveExpenseCopilotAction) => Promise<void>;
  handleSaveGlobalPolicyThreshold: () => Promise<void>;
  handleSaveCategoryPolicyThreshold: () => Promise<void>;
  handleDeleteCategoryPolicyThreshold: (categoryId: string) => Promise<void>;
}

export function useExpensesCopilotPolicyState({
  categories,
  initialCopilotAlerts,
  initialPolicyConfig,
}: UseExpensesCopilotPolicyStateArgs): UseExpensesCopilotPolicyStateResult {
  const router = useRouter();

  const [copilotAlerts, setCopilotAlerts] = useState<ExpenseCopilotAlert[]>(initialCopilotAlerts);
  const [resolvingAlerts, setResolvingAlerts] = useState<Record<string, boolean>>({});
  const [globalPolicyThreshold, setGlobalPolicyThreshold] = useState<string>(
    String(initialPolicyConfig.globalThresholdUsd)
  );
  const [categoryPolicyThresholds, setCategoryPolicyThresholds] = useState<Record<string, string>>(() => {
    const entries = Object.entries(initialPolicyConfig.categoryThresholds).map(([categoryId, threshold]) => [
      categoryId,
      String(threshold),
    ]);
    return Object.fromEntries(entries);
  });
  const [selectedPolicyCategoryId, setSelectedPolicyCategoryId] = useState<string>("");
  const [selectedPolicyThreshold, setSelectedPolicyThreshold] = useState<string>("");
  const [isSavingGlobalPolicy, setIsSavingGlobalPolicy] = useState<boolean>(false);
  const [isSavingCategoryPolicy, setIsSavingCategoryPolicy] = useState<boolean>(false);

  useEffect(() => {
    setCopilotAlerts(initialCopilotAlerts);
  }, [initialCopilotAlerts]);

  useEffect(() => {
    setGlobalPolicyThreshold(String(initialPolicyConfig.globalThresholdUsd));
    const entries = Object.entries(initialPolicyConfig.categoryThresholds).map(([categoryId, threshold]) => [
      categoryId,
      String(threshold),
    ]);
    setCategoryPolicyThresholds(Object.fromEntries(entries));
  }, [initialPolicyConfig]);

  const resolveCopilotAlert = async (
    alertId: string,
    action: ResolveExpenseCopilotAction
  ): Promise<void> => {
    setResolvingAlerts((previous) => ({ ...previous, [alertId]: true }));
    const result = await resolveExpenseCopilotAlert(alertId, action);

    if (!result.success) {
      toast.error(result.error);
      setResolvingAlerts((previous) => ({ ...previous, [alertId]: false }));
      return;
    }

    setCopilotAlerts((previous) => previous.filter((alert) => alert.id !== alertId));
    toast.success(
      action === "APPROVE"
        ? "Alert marked as valid"
        : action === "DISMISS"
          ? "Alert marked as false alarm"
          : "Receipt request sent to expense owner"
    );
    setResolvingAlerts((previous) => ({ ...previous, [alertId]: false }));
    router.refresh();
  };

  const handleSaveGlobalPolicyThreshold = async (): Promise<void> => {
    const threshold = Number.parseFloat(globalPolicyThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      toast.error("Global threshold must be greater than 0");
      return;
    }

    setIsSavingGlobalPolicy(true);
    const result = await updateGlobalExpensePolicyThreshold(threshold);
    setIsSavingGlobalPolicy(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Global policy threshold updated");
    router.refresh();
  };

  const handleSaveCategoryPolicyThreshold = async (): Promise<void> => {
    if (!selectedPolicyCategoryId) {
      toast.error("Select a category first");
      return;
    }

    const threshold = Number.parseFloat(selectedPolicyThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      toast.error("Category threshold must be greater than 0");
      return;
    }

    setIsSavingCategoryPolicy(true);
    const result = await upsertCategoryExpensePolicyThreshold(selectedPolicyCategoryId, threshold);
    setIsSavingCategoryPolicy(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setCategoryPolicyThresholds((previous) => ({
      ...previous,
      [selectedPolicyCategoryId]: String(threshold),
    }));
    setSelectedPolicyThreshold(String(threshold));
    toast.success("Category threshold updated");
    router.refresh();
  };

  const handleDeleteCategoryPolicyThreshold = async (categoryId: string): Promise<void> => {
    setIsSavingCategoryPolicy(true);
    const result = await deleteCategoryExpensePolicyThreshold(categoryId);
    setIsSavingCategoryPolicy(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setCategoryPolicyThresholds((previous) => {
      const next = { ...previous };
      delete next[categoryId];
      return next;
    });
    if (selectedPolicyCategoryId === categoryId) {
      setSelectedPolicyThreshold("");
    }
    toast.success("Category override removed");
    router.refresh();
  };

  const handleSelectedPolicyCategoryChange = (categoryId: string): void => {
    setSelectedPolicyCategoryId(categoryId);
    setSelectedPolicyThreshold(categoryPolicyThresholds[categoryId] ?? "");
  };

  const categoryPolicyOverrides = categories
    .filter((category) => categoryPolicyThresholds[category.id] !== undefined)
    .map((category) => ({
      id: category.id,
      name: category.name,
      threshold: categoryPolicyThresholds[category.id],
    }));

  return {
    copilotAlerts,
    resolvingAlerts,
    globalPolicyThreshold,
    categoryPolicyThresholds,
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
  };
}

