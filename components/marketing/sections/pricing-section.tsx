import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";
import type { ReactElement } from "react";

import {
  getPricingBadgeClassName,
  getPricingCardClassName,
  getPricingFeatureIconClassName,
  getPricingFeatureIconContainerClassName,
  getPricingFeatureTextClassName,
  getPricingPrimaryButtonClassName,
} from "@/components/pricing/plan-card-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildOnboardingUrl,
  type PricingIntent,
} from "@/lib/auth/redirect-intent";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type { PricingPlanPresentation } from "@/lib/marketing/pricing-plans";

interface PricingSectionProps {
  readonly plans: readonly PricingPlanPresentation[];
}

function getPlanSignupHref(planName: PricingPlanPresentation["name"]): string {
  const pricingIntent: PricingIntent = planName === "Pro" ? "pro" : "free"
  const postOnboardingRedirect =
    planName === "Pro" ? "/dashboard/billing" : "/dashboard"
  const redirectTo = buildOnboardingUrl({
    pricingIntent: planName === "Pro" ? "pro" : undefined,
    redirectTo: postOnboardingRedirect,
  })

  return `/signup?plan=${pricingIntent}&redirectTo=${encodeURIComponent(redirectTo)}`
}

function PricingCard({ plan }: { readonly plan: PricingPlanPresentation }): ReactElement {
  return (
    <div className="h-full transition-transform duration-200 hover:-translate-y-1">
      <div
        className={cn(
          "grid h-full grid-rows-[auto_auto_auto_1fr_auto] p-6",
          getPricingCardClassName(Boolean(plan.isPopular))
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
            {plan.isPopular ? (
              <Sparkles className="size-5 text-indigo-500 dark:text-indigo-400" />
            ) : null}
          </div>
          <div className="h-6">
            {plan.badge ? (
              <Badge className={getPricingBadgeClassName(Boolean(plan.isPopular))}>
                {plan.badge}
              </Badge>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
        <div className="mt-4">
          <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
          <span className="ml-1 text-sm text-muted-foreground">/{plan.period}</span>
        </div>
        <div className="mt-6">
          <ul className="space-y-3">
            {plan.features.map((feature) => (
              <li key={`${plan.name}-${feature.text}`} className="flex items-start gap-3 text-sm">
                <div className={getPricingFeatureIconContainerClassName(feature.included)}>
                  {feature.included ? (
                    <Check className={getPricingFeatureIconClassName(true)} />
                  ) : (
                    <X className={getPricingFeatureIconClassName(false)} />
                  )}
                </div>
                <span className={getPricingFeatureTextClassName(feature.included)}>
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6">
          <Button
            asChild
            className={getPricingPrimaryButtonClassName(Boolean(plan.isPopular))}
            variant={plan.isPopular ? "default" : "outline"}
            size="lg"
          >
            <Link href={getPlanSignupHref(plan.name)}>{plan.cta}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PricingSection({ plans }: PricingSectionProps): ReactElement {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-24 py-16">
      <div className="mb-10 text-center">
        <h2
          id="pricing-heading"
          className={cn(displayFont.className, "text-3xl font-semibold tracking-tight sm:text-4xl")}
        >
          Choose your plan
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Create a workspace, invite your team, and upgrade only when you need deeper controls.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
        {plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span>Secure OAuth authentication</span>
        </div>
        <p className="text-xs">
          No credit card required for Free tier. Start with OAuth, then finish setup in onboarding.
        </p>
      </div>
    </section>
  );
}
