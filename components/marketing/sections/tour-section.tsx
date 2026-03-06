"use client";

import dynamic from "next/dynamic";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";

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

interface TourStep {
  readonly title: string;
  readonly description: string;
  readonly detail: string;
}

interface TourSectionProps {
  readonly tourSteps: readonly TourStep[];
}

// Static step card for mobile
function StaticStepCard({ step, index }: { step: TourStep; index: number }) {
  return (
    <div className="relative flex gap-6 md:items-start">
      <div className="relative z-10 hidden shrink-0 md:block">
        <div className="flex size-10 items-center justify-center rounded-full border-2 border-indigo-500 bg-background shadow-lg shadow-indigo-500/20">
          <span className="text-sm font-semibold text-indigo-600">{index + 1}</span>
        </div>
      </div>
      <div className="flex-1">
        <Card className="border-border/80 bg-card/85">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="md:hidden border-indigo-300/70 text-indigo-700 dark:text-indigo-300">
                Step {index + 1}
              </Badge>
              <CardTitle className="text-xl">{step.title}</CardTitle>
            </div>
            <CardDescription className="text-base">{step.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{step.detail}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Static section header
function SectionHeader() {
  return (
    <div className="mb-10">
      <h2
        id="tour-heading"
        className={cn(displayFont.className, "text-3xl font-semibold tracking-tight sm:text-4xl")}
      >
        Three-step <span className="text-gradient">operating flow</span>
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Clear sequence from capture to control to review. Live visual proof is shown above for each workflow outcome.
      </p>
    </div>
  );
}

export function TourSection({ tourSteps }: TourSectionProps): React.JSX.Element {
  const { useMobileOptimizedContent } = useMarketingDeviceProfile();

  // Mobile: render static content
  if (useMobileOptimizedContent) {
    return (
      <section id="tour" aria-labelledby="tour-heading" className="scroll-mt-24 py-16">
        <SectionHeader />
        <div className="relative">
          <div className="absolute left-[19px] top-0 hidden h-full w-px bg-gradient-to-b from-indigo-500 via-violet-500 to-cyan-500 md:block" />
          <div className="space-y-6">
            {tourSteps.map((step, index) => (
              <StaticStepCard key={step.title} step={step} index={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Desktop: render with animations
  return (
    <section id="tour" aria-labelledby="tour-heading" className="scroll-mt-24 py-16">
      <TextReveal>
        <SectionHeader />
      </TextReveal>

      <div className="relative">
        <div className="absolute left-[19px] top-0 hidden h-full w-px bg-gradient-to-b from-indigo-500 via-violet-500 to-cyan-500 md:block" />

        <StaggerContainer className="space-y-6" staggerDelay={0.2} delayChildren={0.3}>
          {tourSteps.map((step, index) => (
            <StaggerItem key={step.title}>
              <div className="relative flex gap-6 md:items-start">
                <div className="relative z-10 hidden shrink-0 md:block">
                  <div className="flex size-10 items-center justify-center rounded-full border-2 border-indigo-500 bg-background shadow-lg shadow-indigo-500/20">
                    <span className="text-sm font-semibold text-indigo-600">{index + 1}</span>
                  </div>
                </div>

                <SpotlightCard className="flex-1" spotlightColor="rgba(99, 102, 241, 0.08)" borderColor="rgba(99, 102, 241, 0.15)">
                  <Card className="border-border/80 bg-card/85">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="md:hidden border-indigo-300/70 text-indigo-700 dark:text-indigo-300">
                          Step {index + 1}
                        </Badge>
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                      </div>
                      <CardDescription className="text-base">{step.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{step.detail}</p>
                    </CardContent>
                  </Card>
                </SpotlightCard>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
