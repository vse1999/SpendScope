"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Lock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { isGenericPlanRestrictionReason } from "./copy-utils";
import { getUpgradeFeatureCopy } from "./upgrade-copy";
import type { UpgradeDialogContext } from "./types";

interface UpgradeToProDialogProps {
  open: boolean;
  context: UpgradeDialogContext | null;
  isAdmin: boolean;
  billingEnabled: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CheckoutApiResponse {
  url?: string;
  error?: string;
}

export function UpgradeToProDialog({
  open,
  context,
  isAdmin,
  billingEnabled,
  onOpenChange,
}: UpgradeToProDialogProps): React.JSX.Element {
  const router = useRouter();
  const [isStartingCheckout, setIsStartingCheckout] = useState<boolean>(false);

  if (!context) {
    return <></>;
  }

  const copy = getUpgradeFeatureCopy(context.feature);
  const canStartCheckout = isAdmin && billingEnabled;
  const showBillingInfoCta = !isAdmin;
  const reason = isGenericPlanRestrictionReason(context.reason) ? undefined : context.reason;

  const handlePrimaryAction = async (): Promise<void> => {
    if (canStartCheckout) {
      setIsStartingCheckout(true);
      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
        });
        const payload = (await response.json()) as CheckoutApiResponse;

        if (!response.ok || !payload.url) {
          toast.error(payload.error ?? "Failed to start checkout");
          setIsStartingCheckout(false);
          return;
        }

        window.location.href = payload.url;
        return;
      } catch {
        toast.error("Failed to start checkout");
      } finally {
        setIsStartingCheckout(false);
      }
      return;
    }

    router.push("/dashboard/billing");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Pro Feature
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3.5 w-3.5" />
              Free Plan
            </Badge>
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {reason && (
          <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {reason}
          </div>
        )}

        <ul className="space-y-2">
          {copy.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {!isAdmin && (
          <p className="text-xs text-muted-foreground">
            You can review plan details, but only admins can activate Pro for your team.
          </p>
        )}

        {isAdmin && !billingEnabled && (
          <p className="text-xs text-muted-foreground">
            Billing is unavailable in this environment. Enable billing to start checkout.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            onClick={handlePrimaryAction}
            disabled={isStartingCheckout || (isAdmin && !billingEnabled)}
            className="gap-2"
          >
            {isStartingCheckout ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                {showBillingInfoCta ? "Go to Billing" : "Upgrade to Pro"}
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
