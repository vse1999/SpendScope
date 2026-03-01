"use client";

import { format } from "date-fns";
import {
  CheckCircle2,
  FileWarning,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  ExpenseCopilotAlert,
  ResolveExpenseCopilotAction,
} from "@/app/actions/expenses";
import type { Category } from "../expenses-client-types";
import { getCopilotRuleLabel, getSeverityVariant } from "../expenses-client-helpers";

interface ExpenseCopilotPanelProps {
  isAdmin: boolean;
  alerts: ExpenseCopilotAlert[];
  resolvingAlerts: Record<string, boolean>;
  onResolveAlert: (alertId: string, action: ResolveExpenseCopilotAction) => Promise<void>;
  globalPolicyThreshold: string;
  onGlobalPolicyThresholdChange: (value: string) => void;
  onSaveGlobalPolicyThreshold: () => Promise<void>;
  isSavingGlobalPolicy: boolean;
  categories: Category[];
  selectedPolicyCategoryId: string;
  onSelectedPolicyCategoryChange: (categoryId: string) => void;
  selectedPolicyThreshold: string;
  onSelectedPolicyThresholdChange: (value: string) => void;
  onSaveCategoryPolicyThreshold: () => Promise<void>;
  isSavingCategoryPolicy: boolean;
  categoryPolicyOverrides: Array<{ id: string; name: string; threshold: string }>;
  onDeleteCategoryPolicyThreshold: (categoryId: string) => Promise<void>;
}

export function ExpenseCopilotPanel({
  isAdmin,
  alerts,
  resolvingAlerts,
  onResolveAlert,
  globalPolicyThreshold,
  onGlobalPolicyThresholdChange,
  onSaveGlobalPolicyThreshold,
  isSavingGlobalPolicy,
  categories,
  selectedPolicyCategoryId,
  onSelectedPolicyCategoryChange,
  selectedPolicyThreshold,
  onSelectedPolicyThresholdChange,
  onSaveCategoryPolicyThreshold,
  isSavingCategoryPolicy,
  categoryPolicyOverrides,
  onDeleteCategoryPolicyThreshold,
}: ExpenseCopilotPanelProps): React.JSX.Element {
  return (
    <>
      <Card className={alerts.length > 0 ? "border-amber-300/60" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            Expense Monitor
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Explainable review alerts. Mark valid, mark false alarm, or request receipt proof.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No active review alerts. Recent expense activity looks normal.
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityVariant(alert.severity)}>
                        {getCopilotRuleLabel(alert.ruleType)}
                      </Badge>
                      <Badge variant="outline">Severity {alert.severity}</Badge>
                      <Badge variant="outline">
                        Rule score {(alert.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{alert.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.expense.userDisplayName} | {alert.expense.categoryName} |{" "}
                      {format(new Date(alert.expense.date), "MMM d, yyyy")} | $
                      {alert.expense.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                {isAdmin ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full justify-center sm:w-auto"
                      disabled={resolvingAlerts[alert.id] === true}
                      onClick={() => onResolveAlert(alert.id, "APPROVE")}
                    >
                      {resolvingAlerts[alert.id] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Mark Valid
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-center sm:w-auto"
                      disabled={resolvingAlerts[alert.id] === true}
                      onClick={() => onResolveAlert(alert.id, "DISMISS")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      False Alarm
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full justify-center sm:w-auto"
                      disabled={resolvingAlerts[alert.id] === true}
                      onClick={() => onResolveAlert(alert.id, "REQUEST_RECEIPT")}
                    >
                      <FileWarning className="mr-2 h-4 w-4" />
                      Request Receipt
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Only admins can resolve these alerts.
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Policy Threshold Controls
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure the amount limits used by expense monitor policy risk detection.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  disabled={isSavingGlobalPolicy}
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
                <Select
                  value={selectedPolicyCategoryId}
                  onValueChange={(value) => onSelectedPolicyCategoryChange(value)}
                >
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
                  disabled={isSavingCategoryPolicy || !selectedPolicyCategoryId}
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
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
