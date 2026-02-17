"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { TextReveal, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import { SpotlightCard } from "@/components/marketing/animations";

interface LandingFeature {
  readonly title: string;
  readonly description: string;
  readonly iconName: string;
}

interface FeaturesSectionProps {
  readonly features: readonly LandingFeature[];
  readonly iconMap: Record<string, LucideIcon>;
}

export function FeaturesSection({ features, iconMap }: FeaturesSectionProps) {
  return (
    <section
      id="product"
      aria-labelledby="product-heading"
      className="scroll-mt-24 py-16 sm:py-20"
    >
      <TextReveal>
        <div className="mb-12 text-center">
          <h2
            id="product-heading"
            className={cn(
              displayFont.className,
              "text-3xl font-semibold tracking-tight sm:text-4xl"
            )}
          >
            Product capabilities with{" "}
            <span className="text-gradient">operational depth</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            A practical product surface designed for teams that want control,
            not process drag.
          </p>
        </div>
      </TextReveal>

      <StaggerContainer 
        className="grid gap-6 md:grid-cols-3"
        staggerDelay={0.15}
        delayChildren={0.2}
      >
        {features.map((feature) => {
          const Icon = iconMap[feature.iconName];
          if (!Icon) return null;
          
          return (
            <StaggerItem key={feature.title}>
              <SpotlightCard
                className="h-full"
                spotlightColor="rgba(99, 102, 241, 0.1)"
                borderColor="rgba(99, 102, 241, 0.2)"
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Card className="h-full border-indigo-100/80 bg-white/85 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-indigo-950/5 dark:border-indigo-900/40 dark:bg-slate-950/70"
                  >
                    <CardHeader className="gap-4">
                      <motion.div 
                        className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-950/30 dark:to-violet-950/30"
                        whileHover={{ rotate: 5, scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Icon className="size-6 text-indigo-600 dark:text-indigo-400" />
                      </motion.div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </SpotlightCard>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </section>
  );
}
