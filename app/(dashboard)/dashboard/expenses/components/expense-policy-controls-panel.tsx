import { Loader2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category } from "../expenses-client-types";

interface ExpensePolicyControlsPanelProps {
  categories: Category[];
  categoryPolicyOverrides: Array<{ id: string; name: string; threshold: string }>;
  globalPolicyThreshold: string;
  isRefreshing: boolean;
  isSavingCategoryPolicy: boolean;
  isSavingGlobalPolicy: boolean;
  onDeleteCategoryPolicyThreshold: (categoryId: string) => Promise<void>;
  onGlobalPolicyThresholdChange: (value: string) => void;
  onSaveCategoryPolicyThreshold: () => Promise<void>;
  onSaveGlobalPolicyThreshold: () => Promise<void>;
  onSelectedPolicyCategoryChange: (categoryId: string) => void;
  onSelectedPolicyThresholdChange: (value: string) => void;
  selectedPolicyCategoryId: string;
  selectedPolicyThreshold: string;
}

export function ExpensePolicyControlsPanel({
  categories,
  categoryPolicyOverrides,
  globalPolicyThreshold,
  isRefreshing,
  isSavingCategoryPolicy,
  isSavingGlobalPolicy,
  onDeleteCategoryPolicyThreshold,
  onGlobalPolicyThresholdChange,
  onSaveCategoryPolicyThreshold,
  onSaveGlobalPolicyThreshold,
  onSelectedPolicyCategoryChange,
  onSelectedPolicyThresholdChange,
  selectedPolicyCategoryId,
  selectedPolicyThreshold,
}: ExpensePolicyControlsPanelProps): React.JSX.Element {
  const isCategoryActionDisabled = isSavingCategoryPolicy || isRefreshing;
  const isGlobalActionDisabled = isSavingGlobalPolicy || isRefreshing;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <label className="text-sm font-medium">Global Threshold (USD)</label>
          <Input
            type="number"
            min="1"
            step="0.01"
            value={globalPolicyThreshold}
            onChange={(event) => onGlobalPolicyThresholdChange(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={onSaveGlobalPolicyThreshold}
            disabled={isGlobalActionDisabled}
            className="w-full md:w-auto"
          >
            {isSavingGlobalPolicy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Global
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category Override</label>
          <Select value={selectedPolicyCategoryId} onValueChange={onSelectedPolicyCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Threshold (USD)</label>
          <Input
            type="number"
            min="1"
            step="0.01"
            value={selectedPolicyThreshold}
            onChange={(event) => onSelectedPolicyThresholdChange(event.target.value)}
            disabled={!selectedPolicyCategoryId}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={onSaveCategoryPolicyThreshold}
            disabled={isCategoryActionDisabled || !selectedPolicyCategoryId}
            className="w-full md:w-auto"
          >
            {isSavingCategoryPolicy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Category
          </Button>
        </div>
      </div>

      {categoryPolicyOverrides.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Active Category Overrides</p>
          <div className="flex flex-wrap gap-2">
            {categoryPolicyOverrides.map((override) => (
              <Badge key={override.id} variant="secondary" className="gap-2 py-1">
                {override.name}: ${Number.parseFloat(override.threshold).toLocaleString()}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onDeleteCategoryPolicyThreshold(override.id)}
                  aria-label={`Remove ${override.name} threshold override`}
                  disabled={isCategoryActionDisabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
