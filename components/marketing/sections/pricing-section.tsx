"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { TextReveal, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import { SpotlightCard } from "@/components/marketing/animations";

interface PricingPlan {
  readonly name: "Free" | "Pro";
  readonly description: string;
  readonly price: string;
  readonly period: string;
  readonly isPopular?: boolean;
  readonly badge?: string;
  readonly features: readonly string[];
  readonly cta?: string;
}

interface PricingSectionProps {
  readonly plans: readonly PricingPlan[];
}

function PricingCard({ plan }: { readonly plan: PricingPlan }) {
  return (
    <StaggerItem>
      <SpotlightCard
        className="h-full"
        spotlightColor={plan.isPopular ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.05)"}
        borderColor={plan.isPopular ? "rgba(99, 102, 241, 0.4)" : "rgba(99, 102, 241, 0.1)"}
      >
        <motion.div
          whileHover={{ y: -6 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className={cn(
            "grid h-full grid-rows-[auto_auto_auto_1fr_auto] rounded-xl border p-6",
            plan.isPopular
              ? "border-indigo-500/40 bg-gradient-to-br from-indigo-950/30 via-slate-950 to-violet-950/30 shadow-xl shadow-indigo-500/10 dark:border-indigo-500/40 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/30"
              : "border-white/10 bg-card/50 dark:border-white/10 dark:bg-slate-950/50"
          )}
        >
          {/* Row 1: Title + Badge */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-semibold tracking-tight">
                {plan.name}
              </h3>
              {plan.isPopular && (
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="size-5 text-indigo-400" />
                </motion.div>
              )}
            </div>
            <div className="h-6">
              {plan.badge && (
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 0 rgba(99, 102, 241, 0)",
                      "0 0 20px rgba(99, 102, 241, 0.3)",
                      "0 0 0 rgba(99, 102, 241, 0)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge 
                    className={cn(
                      "text-xs",
                      plan.isPopular 
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0" 
                        : "bg-muted text-muted-foreground"
                    )}
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
                  key={feature}
                  className="flex items-start gap-3 text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: featureIndex * 0.1 }}
                >
                  <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                    <Check className="size-2.5 text-indigo-400" />
                  </div>
                  <span className="text-foreground/90">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Row 5: CTA */}
          <div className="mt-6">
            <Button
              asChild
              className={cn(
                "w-full transition-all duration-300",
                plan.isPopular
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02]"
                  : "border border-white/20 bg-transparent text-foreground hover:bg-white/5"
              )}
              variant={plan.isPopular ? "default" : "outline"}
              size="lg"
            >
              <Link href="/login?intent=signup">
                {plan.cta ?? (plan.isPopular ? "Choose Pro" : "Start Free")}
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
