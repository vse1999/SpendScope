"use client";

import { BarChart3, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { isGenericPlanRestrictionReason } from "./copy-utils";
import { UpgradeToProDialog } from "./upgrade-to-pro-dialog";
import { useUpgradeToProDialog } from "./use-upgrade-to-pro-dialog";

interface AnalyticsUpgradeGateProps {
  reason: string;
  isAdmin: boolean;
  billingEnabled: boolean;
}

export function AnalyticsUpgradeGate({
  reason,
  isAdmin,
  billingEnabled,
}: AnalyticsUpgradeGateProps): React.JSX.Element {
  const {
    open,
    context,
    openUpgradeDialog,
    onOpenChange,
  } = useUpgradeToProDialog();
  const description = isGenericPlanRestrictionReason(reason)
    ? "Analytics is included with Pro. Upgrade to unlock trend intelligence, category breakdowns, and team-level visibility."
    : reason;

  return (
    <>
      <Card className="app-card-strong border-border/70">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <BarChart3 className="h-5 w-5" />
            <Sparkles className="h-4 w-4" />
          </div>
          <CardTitle>Advanced analytics is available on Pro</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Upgrade to unlock richer insights, trend visibility, and advanced reporting controls.
          </p>
          <Button
            onClick={() =>
              openUpgradeDialog({
                feature: "analytics",
                source: "analytics_page",
                reason,
              })
            }
          >
            Unlock Pro Analytics
          </Button>
        </CardContent>
      </Card>

      <UpgradeToProDialog
        open={open}
        context={context}
        isAdmin={isAdmin}
        billingEnabled={billingEnabled}
        onOpenChange={onOpenChange}
      />
    </>
  );
}
