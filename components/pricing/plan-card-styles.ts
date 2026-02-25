import { cn } from "@/lib/utils";

export function getPricingCardClassName(isPopular: boolean): string {
  return cn(
    "h-full overflow-hidden rounded-xl border",
    isPopular
      ? "border-indigo-500/40 bg-gradient-to-br from-indigo-950/30 via-slate-950 to-violet-950/30 shadow-xl shadow-indigo-500/10 dark:border-indigo-500/40 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/30"
      : "border-white/10 bg-card/50 dark:border-white/10 dark:bg-slate-950/50"
  );
}

export function getPricingBadgeClassName(isPopular: boolean): string {
  return cn(
    "text-xs",
    isPopular
      ? "border-0 bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
      : "bg-muted text-muted-foreground"
  );
}

export function getPricingFeatureIconContainerClassName(included: boolean): string {
  return cn(
    "flex size-4 shrink-0 items-center justify-center rounded-full",
    included
      ? "bg-indigo-500/20"
      : "bg-muted ring-1 ring-border/70"
  );
}

export function getPricingFeatureIconClassName(included: boolean): string {
  return included ? "size-2.5 text-indigo-400" : "size-2.5 text-muted-foreground";
}

export function getPricingFeatureTextClassName(included: boolean): string {
  return included ? "text-foreground/90" : "text-muted-foreground";
}

export function getPricingPrimaryButtonClassName(isPopular: boolean): string {
  return cn(
    "w-full transition-all duration-300",
    isPopular
      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40"
      : "border border-white/20 bg-transparent text-foreground hover:bg-white/5"
  );
}
