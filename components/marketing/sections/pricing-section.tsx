"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { TextReveal, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import { SpotlightCard } from "@/components/marketing/animations";
import {
  getPricingBadgeClassName,
  getPricingCardClassName,
  getPricingFeatureIconClassName,
  getPricingFeatureIconContainerClassName,
  getPricingFeatureTextClassName,
  getPricingPrimaryButtonClassName,
} from "@/components/pricing/plan-card-styles";
import type { PricingPlanPresentation } from "@/lib/marketing/pricing-plans";

interface PricingSectionProps {
  readonly plans: readonly PricingPlanPresentation[];
}

function PricingCard({ plan }: { readonly plan: PricingPlanPresentation }) {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();

  return (
    <StaggerItem>
      <SpotlightCard
        className="h-full"
        spotlightColor={plan.isPopular ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.05)"}
        borderColor={plan.isPopular ? "rgba(99, 102, 241, 0.4)" : "rgba(99, 102, 241, 0.1)"}
      >
        <motion.div
          whileHover={allowEnhancedMotion ? { y: -6 } : undefined}
          transition={
            allowEnhancedMotion
              ? { type: "spring", stiffness: 400, damping: 17 }
              : undefined
          }
          className={cn("grid h-full grid-rows-[auto_auto_auto_1fr_auto] p-6", getPricingCardClassName(Boolean(plan.isPopular)))}
        >
          {/* Row 1: Title + Badge */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-semibold tracking-tight">
                {plan.name}
              </h3>
              {plan.isPopular && (
                <motion.div
                  initial={allowEnhancedMotion ? { rotate: 0 } : undefined}
                  animate={allowEnhancedMotion ? { rotate: [0, 15, -15, 0] } : undefined}
                  transition={
                    allowEnhancedMotion
                      ? { duration: 2, repeat: Infinity, repeatDelay: 3 }
                      : undefined
                  }
                >
                  <Sparkles className="size-5 text-indigo-400" />
                </motion.div>
              )}
            </div>
            <div className="h-6">
              {plan.badge && (
                <motion.div
                  animate={
                    allowEnhancedMotion
                      ? {
                          boxShadow: [
                            "0 0 0 rgba(99, 102, 241, 0)",
                            "0 0 20px rgba(99, 102, 241, 0.3)",
                            "0 0 0 rgba(99, 102, 241, 0)",
                          ],
                        }
                      : undefined
                  }
                  transition={
                    allowEnhancedMotion ? { duration: 2, repeat: Infinity } : undefined
                  }
                >
                  <Badge 
                    className={getPricingBadgeClassName(Boolean(plan.isPopular))}
                  >
                    {plan.badge}
                  </Badge>
                </motion.div>
              )}
            </div>
          </div>

          {/* Row 2: Description */}
          <p className="mt-2 text-sm text-muted-foreground">
            {plan.description}
          </p>

          {/* Row 3: Price */}
          <div className="mt-4">
            <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
            <span className="ml-1 text-sm text-muted-foreground">/{plan.period}</span>
          </div>

          {/* Row 4: Features */}
          <div className="mt-6">
            <ul className="space-y-3">
              {plan.features.map((feature, featureIndex) => (
                <motion.li
                  key={`${plan.name}-${feature.text}`}
                  className="flex items-start gap-3 text-sm"
                  initial={allowEnhancedMotion ? { opacity: 0, x: -10 } : undefined}
                  whileInView={allowEnhancedMotion ? { opacity: 1, x: 0 } : undefined}
                  viewport={allowEnhancedMotion ? { once: true } : undefined}
                  transition={allowEnhancedMotion ? { delay: featureIndex * 0.1 } : undefined}
                >
                  <div className={getPricingFeatureIconContainerClassName(feature.included)}>
                    {feature.included ? (
                      <Check className={getPricingFeatureIconClassName(true)} />
                    ) : (
                      <X className={getPricingFeatureIconClassName(false)} />
                    )}
                  </div>
                  <span className={getPricingFeatureTextClassName(feature.included)}>{feature.text}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Row 5: CTA */}
          <div className="mt-6">
            <Button
              asChild
              className={getPricingPrimaryButtonClassName(Boolean(plan.isPopular))}
              variant={plan.isPopular ? "default" : "outline"}
              size="lg"
            >
              <Link href="/signup">
                {plan.cta}
              </Link>
            </Button>
          </div>
        </motion.div>
      </SpotlightCard>
    </StaggerItem>
  );
}

export function PricingSection({ plans }: PricingSectionProps) {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-24 py-16"
    >
      <TextReveal>
        <div className="mb-10 text-center">
          <h2
            id="pricing-heading"
            className={cn(
              displayFont.className,
              "text-3xl font-semibold tracking-tight sm:text-4xl"
            )}
          >
            Choose your plan
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Start free and upgrade when you need more power
          </p>
        </div>
      </TextReveal>

      <StaggerContainer 
        className="grid gap-6 md:grid-cols-2 lg:gap-8"
        staggerDelay={0.15}
        delayChildren={0.2}
      >
        {plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </StaggerContainer>

      {/* Trust indicators */}
      <TextReveal delay={0.4} className="mt-8">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Secure OAuth authentication</span>
          </div>
          <p className="text-xs">No credit card required for Free tier. Cancel anytime.</p>
        </div>
      </TextReveal>
    </section>
  );
}
