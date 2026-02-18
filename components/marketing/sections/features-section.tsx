"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { TextReveal, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import {
  CategoryDistributionChart,
  UserSpendingChart,
} from "@/components/analytics";
import type { AnalyticsData } from "@/types/analytics";

interface FeaturesSectionProps {
  readonly analyticsData: AnalyticsData;
}

export function FeaturesSection({ analyticsData }: FeaturesSectionProps) {
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
            Analytics that drive <span className="text-gradient">better decisions</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Real-time insights into spending patterns, team behavior, and budget performance. Visualize trends and take action with confidence.
          </p>
        </div>
      </TextReveal>

      <StaggerContainer
        className="grid gap-6 lg:grid-cols-2"
        staggerDelay={0.12}
        delayChildren={0.15}
      >
        <StaggerItem>
          <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 340, damping: 24 }}>
            <CategoryDistributionChart data={analyticsData.categoryDistribution} />
          </motion.div>
        </StaggerItem>

        <StaggerItem>
          <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 340, damping: 24 }}>
            <UserSpendingChart data={analyticsData.userSpending} />
          </motion.div>
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}
