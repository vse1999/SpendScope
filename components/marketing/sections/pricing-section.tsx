"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import {
  getPricingBadgeClassName,
  getPricingCardClassName,
  getPricingFeatureIconClassName,
  getPricingFeatureIconContainerClassName,
  getPricingFeatureTextClassName,
  getPricingPrimaryButtonClassName,
} from "@/components/pricing/plan-card-styles";
import type { PricingPlanPresentation } from "@/lib/marketing/pricing-plans";

// Lazy load animation components
const TextReveal = dynamic(
  () => import("@/components/marketing/animations").then((m) => m.TextReveal),
  { ssr: false, loading: () => <div /> }
);

const StaggerContainer = dynamic(
  () => import("@/components/marketing/animations").then((m) => m.StaggerContainer),
  { ssr: false, loading: () => <div /> }
);

const StaggerItem = dynamic(
  () => import("@/components/marketing/animations").then((m) => m.StaggerItem),
  { ssr: false, loading: () => <div /> }
);

const SpotlightCard = dynamic(
  () => import("@/components/marketing/animations").then((m) => m.SpotlightCard),
  { ssr: false, loading: () => <div /> }
);

interface PricingSectionProps {
  readonly plans: readonly PricingPlanPresentation[];
}

// Static pricing card content - shared between static and animated versions
function PricingCardContent({ plan }: { readonly plan: PricingPlanPresentation }) {
  return (
    <div className={cn("grid h-full grid-rows-[auto_auto_auto_1fr_auto] p-6", getPricingCardClassName(Boolean(plan.isPopular)))}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
          {plan.isPopular && <Sparkles className="size-5 text-indigo-500 dark:text-indigo-400" />}
        </div>
        <div className="h-6">
          {plan.badge && (
            <Badge className={getPricingBadgeClassName(Boolean(plan.isPopular))}>{plan.badge}</Badge>
          )}
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
              <span className={getPricingFeatureTextClassName(feature.included)}>{feature.text}</span>
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
          <Link href="/signup">{plan.cta}</Link>
        </Button>
      </div>
    </div>
  );
}

// Static pricing card for mobile
function StaticPricingCard({ plan }: { readonly plan: PricingPlanPresentation }) {
  return (
    <div
      className={cn(
        "h-full rounded-xl border transition-transform duration-200 hover:-translate-y-1",
        plan.isPopular ? "border-indigo-400/40" : "border-border/60"
      )}
    >
      <PricingCardContent plan={plan} />
    </div>
  );
}

// Animated pricing card for desktop
function AnimatedPricingCard({ plan }: { readonly plan: PricingPlanPresentation }) {
  return (
    <StaggerItem>
      <SpotlightCard
        className="h-full"
        spotlightColor={plan.isPopular ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.05)"}
        borderColor={plan.isPopular ? "rgba(99, 102, 241, 0.4)" : "rgba(99, 102, 241, 0.1)"}
      >
        <div className="transition-transform duration-200 hover:-translate-y-1.5">
          <PricingCardContent plan={plan} />
        </div>
      </SpotlightCard>
    </StaggerItem>
  );
}

// Static section header
function SectionHeader() {
  return (
    <div className="mb-10 text-center">
      <h2
        id="pricing-heading"
        className={cn(displayFont.className, "text-3xl font-semibold tracking-tight sm:text-4xl")}
      >
        Choose your plan
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
        Start free and upgrade when you need more power
      </p>
    </div>
  );
}

// Trust indicators
function TrustIndicators() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        <span>Secure OAuth authentication</span>
      </div>
      <p className="text-xs">No credit card required for Free tier. Cancel anytime.</p>
    </div>
  );
}

export function PricingSection({ plans }: PricingSectionProps) {
  const { useMobileOptimizedContent } = useMarketingDeviceProfile();

  // Mobile: render static content
  if (useMobileOptimizedContent) {
    return (
      <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-24 py-16">
        <SectionHeader />
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {plans.map((plan) => (
            <StaticPricingCard key={plan.name} plan={plan} />
          ))}
        </div>
        <TrustIndicators />
      </section>
    );
  }

  // Desktop: render with animations
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-24 py-16">
      <TextReveal>
        <SectionHeader />
      </TextReveal>

      <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:gap-8" staggerDelay={0.15} delayChildren={0.2}>
        {plans.map((plan) => (
          <AnimatedPricingCard key={plan.name} plan={plan} />
        ))}
      </StaggerContainer>

      <TextReveal delay={0.4}>
        <TrustIndicators />
      </TextReveal>
    </section>
  );
}
