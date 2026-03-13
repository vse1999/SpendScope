"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  deleteCategoryExpensePolicyThreshold,
  updateGlobalExpensePolicyThreshold,
  upsertCategoryExpensePolicyThreshold,
  type ExpensePolicyConfigView,
} from "@/app/actions/expenses";
import type { Category } from "./expenses-client-types";

const GLOBAL_POLICY_SAVE_ERROR_MESSAGE =
  "Couldn't save the global policy threshold. Please try again.";
const CATEGORY_POLICY_SAVE_ERROR_MESSAGE =
  "Couldn't save the category policy threshold. Please try again.";
const CATEGORY_POLICY_DELETE_ERROR_MESSAGE =
  "Couldn't remove the category override. Please try again.";

interface UseExpensePolicyControlsStateArgs {
  categories: Category[];
  initialPolicyConfig: ExpensePolicyConfigView;
}

interface CategoryPolicyOverride {
  id: string;
  name: string;
  threshold: string;
}

interface UseExpensePolicyControlsStateResult {
  categoryPolicyOverrides: CategoryPolicyOverride[];
  globalPolicyThreshold: string;
  handleDeleteCategoryPolicyThreshold: (categoryId: string) => Promise<void>;
  handleSaveCategoryPolicyThreshold: () => Promise<void>;
  handleSaveGlobalPolicyThreshold: () => Promise<void>;
  handleSelectedPolicyCategoryChange: (categoryId: string) => void;
  isRefreshing: boolean;
  isSavingCategoryPolicy: boolean;
  isSavingGlobalPolicy: boolean;
  selectedPolicyCategoryId: string;
  selectedPolicyThreshold: string;
  setGlobalPolicyThreshold: (value: string) => void;
  setSelectedPolicyThreshold: (value: string) => void;
}

function getInitialCategoryPolicyThresholds(
  policyConfig: ExpensePolicyConfigView
): Record<string, string> {
  const entries = Object.entries(policyConfig.categoryThresholds).map(([categoryId, threshold]) => [
    categoryId,
    String(threshold),
  ]);

  return Object.fromEntries(entries);
}

export function useExpensePolicyControlsState({
  categories,
  initialPolicyConfig,
}: UseExpensePolicyControlsStateArgs): UseExpensePolicyControlsStateResult {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [globalPolicyThreshold, setGlobalPolicyThreshold] = useState<string>(
    String(initialPolicyConfig.globalThresholdUsd)
  );
  const [categoryPolicyThresholds, setCategoryPolicyThresholds] = useState<Record<string, string>>(() =>
    getInitialCategoryPolicyThresholds(initialPolicyConfig)
  );
  const [selectedPolicyCategoryId, setSelectedPolicyCategoryId] = useState<string>("");
  const [selectedPolicyThreshold, setSelectedPolicyThreshold] = useState<string>("");
  const [isSavingGlobalPolicy, setIsSavingGlobalPolicy] = useState<boolean>(false);
  const [isSavingCategoryPolicy, setIsSavingCategoryPolicy] = useState<boolean>(false);

  useEffect(() => {
    setGlobalPolicyThreshold(String(initialPolicyConfig.globalThresholdUsd));
    setCategoryPolicyThresholds(getInitialCategoryPolicyThresholds(initialPolicyConfig));
  }, [initialPolicyConfig]);

  const handleSaveGlobalPolicyThreshold = async (): Promise<void> => {
    const threshold = Number.parseFloat(globalPolicyThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      toast.error("Global threshold must be greater than 0");
      return;
    }

    setIsSavingGlobalPolicy(true);
    try {
      const result = await updateGlobalExpensePolicyThreshold(threshold);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Global policy threshold updated");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error(GLOBAL_POLICY_SAVE_ERROR_MESSAGE);
    } finally {
      setIsSavingGlobalPolicy(false);
    }
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
    try {
      const result = await upsertCategoryExpensePolicyThreshold(selectedPolicyCategoryId, threshold);

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
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error(CATEGORY_POLICY_SAVE_ERROR_MESSAGE);
    } finally {
      setIsSavingCategoryPolicy(false);
    }
  };

  const handleDeleteCategoryPolicyThreshold = async (categoryId: string): Promise<void> => {
    setIsSavingCategoryPolicy(true);
    try {
      const result = await deleteCategoryExpensePolicyThreshold(categoryId);

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
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error(CATEGORY_POLICY_DELETE_ERROR_MESSAGE);
    } finally {
      setIsSavingCategoryPolicy(false);
    }
  };

  const handleSelectedPolicyCategoryChange = (categoryId: string): void => {
    setSelectedPolicyCategoryId(categoryId);
    setSelectedPolicyThreshold(categoryPolicyThresholds[categoryId] ?? "");
  };

  const categoryPolicyOverrides = useMemo(
    () =>
      categories
        .filter((category) => categoryPolicyThresholds[category.id] !== undefined)
        .map((category) => ({
          id: category.id,
          name: category.name,
          threshold: categoryPolicyThresholds[category.id],
        })),
    [categories, categoryPolicyThresholds]
  );

  return {
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
  };
}
