"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { TextReveal, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import { MobileFeatureSummaries } from "./mobile-feature-summaries";
import type { AnalyticsData } from "@/types/analytics";

const DesktopCategoryDistributionChart = dynamic(
  () =>
    import("@/components/analytics/category-distribution-chart").then(
      (module) => module.CategoryDistributionChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] rounded-2xl border border-border/60 bg-card/60" />
    ),
  }
);

const DesktopUserSpendingChart = dynamic(
  () =>
    import("@/components/analytics/user-spending-chart").then(
      (module) => module.UserSpendingChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] rounded-2xl border border-border/60 bg-card/60" />
    ),
  }
);

interface FeaturesSectionProps {
  readonly analyticsData: AnalyticsData;
}

export function FeaturesSection({
  analyticsData,
}: FeaturesSectionProps): React.JSX.Element {
  const { allowEnhancedMotion, useMobileOptimizedContent } =
    useMarketingDeviceProfile();

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

      {useMobileOptimizedContent ? (
        <MobileFeatureSummaries
          categoryDistribution={analyticsData.categoryDistribution}
          userSpending={analyticsData.userSpending}
        />
      ) : (
        <StaggerContainer
          className="grid gap-6 lg:grid-cols-2"
          staggerDelay={0.12}
          delayChildren={0.15}
        >
          <StaggerItem>
            <motion.div
              whileHover={allowEnhancedMotion ? { y: -2 } : undefined}
              transition={
                allowEnhancedMotion
                  ? { type: "spring", stiffness: 340, damping: 24 }
                  : undefined
              }
            >
              <DesktopCategoryDistributionChart data={analyticsData.categoryDistribution} />
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              whileHover={allowEnhancedMotion ? { y: -2 } : undefined}
              transition={
                allowEnhancedMotion
                  ? { type: "spring", stiffness: 340, damping: 24 }
                  : undefined
              }
            >
              <DesktopUserSpendingChart data={analyticsData.userSpending} />
            </motion.div>
          </StaggerItem>
        </StaggerContainer>
      )}
    </section>
  );
}
