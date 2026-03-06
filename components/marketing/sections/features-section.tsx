"use client";

import dynamic from "next/dynamic";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { MobileFeatureSummaries } from "./mobile-feature-summaries";
import type { AnalyticsData } from "@/types/analytics";

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

// Static section header - no animations
function StaticSectionHeader() {
  return (
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
  );
}

export function FeaturesSection({
  analyticsData,
}: FeaturesSectionProps): React.JSX.Element {
  const { useMobileOptimizedContent } = useMarketingDeviceProfile();

  // Mobile: render static content without framer-motion
  if (useMobileOptimizedContent) {
    return (
      <section
        id="product"
        aria-labelledby="product-heading"
        className="scroll-mt-24 py-16 sm:py-20"
      >
        <StaticSectionHeader />
        <MobileFeatureSummaries
          categoryDistribution={analyticsData.categoryDistribution}
          userSpending={analyticsData.userSpending}
        />
      </section>
    );
  }

  // Desktop: render with animations
  return (
    <section
      id="product"
      aria-labelledby="product-heading"
      className="scroll-mt-24 py-16 sm:py-20"
    >
      <TextReveal>
        <StaticSectionHeader />
      </TextReveal>

      <StaggerContainer
        className="grid gap-6 lg:grid-cols-2"
        staggerDelay={0.12}
        delayChildren={0.15}
      >
        <StaggerItem>
          <div className="transition-transform duration-200 hover:-translate-y-0.5">
            <DesktopCategoryDistributionChart data={analyticsData.categoryDistribution} />
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="transition-transform duration-200 hover:-translate-y-0.5">
            <DesktopUserSpendingChart data={analyticsData.userSpending} />
          </div>
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}
