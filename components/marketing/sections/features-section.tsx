import type { ReactElement } from "react";

import { MobileFeatureSummaries } from "@/components/marketing/sections/mobile-feature-summaries";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/types/analytics";

interface FeaturesSectionProps {
  readonly analyticsData: AnalyticsData;
}

export function FeaturesSection({ analyticsData }: FeaturesSectionProps): ReactElement {
  return (
    <section
      id="product"
      aria-labelledby="product-heading"
      className="scroll-mt-24 py-16 sm:py-20"
    >
      <div className="mb-12 text-center">
        <h2
          id="product-heading"
          className={cn(
            displayFont.className,
            "text-3xl font-semibold tracking-tight sm:text-4xl"
          )}
        >
          See where spend is drifting before it becomes a month-end surprise
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Give finance and ops a shared view of category mix, owner-level spend,
          and budget pressure so the team can review issues while they are still
          actionable.
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        <MobileFeatureSummaries
          categoryDistribution={analyticsData.categoryDistribution}
          userSpending={analyticsData.userSpending}
        />
      </div>
    </section>
  );
}
