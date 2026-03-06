"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ChevronRight, ShieldCheck, Layers3, LockKeyhole, Users, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { SummaryCards } from "./summary-cards";
import { MobileHeroPreview } from "./mobile-hero-preview";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import type { AnalyticsData } from "@/types/analytics";

// Lazy load heavy animation components - only loaded when enhanced motion is enabled
const LazyMotionWrapper = dynamic(
  () => import("@/components/marketing/animations/lazy-motion-wrapper").then((m) => m.LazyMotionWrapper),
  { ssr: false }
);

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

const TiltCard = dynamic(
  () => import("@/components/marketing/animations").then((m) => m.TiltCard),
  { ssr: false, loading: () => <div /> }
);

const MeshGradient = dynamic(
  () => import("@/components/marketing/effects").then((m) => m.MeshGradient),
  { ssr: false }
);

const ParticleField = dynamic(
  () => import("@/components/marketing/effects").then((m) => m.ParticleField),
  { ssr: false }
);

const DesktopMonthlyTrendChart = dynamic(
  () =>
    import("@/components/analytics/monthly-trend-chart").then(
      (module) => module.MonthlyTrendChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-87.5 rounded-2xl border border-indigo-100/80 bg-white/80 dark:border-indigo-900/40 dark:bg-slate-900/80" />
    ),
  }
);

// Static fallback components for mobile/SSR
function StaticBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="secondary"
      className="w-fit border-indigo-200/70 bg-indigo-50/80 text-indigo-700 backdrop-blur-sm dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
    >
      <span className="mr-2 inline-block size-2 rounded-full bg-indigo-500" />
      {children}
    </Badge>
  );
}

function StaticTrustItem({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white/50 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm dark:bg-slate-950/50">
      <Icon className="size-4 text-indigo-600 dark:text-indigo-400" />
      <span>{title}</span>
    </div>
  );
}

// Icon mapping for serializable data
const iconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Layers3,
  LockKeyhole,
  Users,
};

interface TrustItem {
  readonly title: string;
  readonly iconName: string;
}

interface HeroSectionProps {
  readonly trustItems: readonly TrustItem[];
  readonly previewData: Pick<AnalyticsData, "monthlyTrend" | "summary" | "userSpending">;
}

// Static hero content - no framer-motion, renders instantly
function StaticHeroContent({
  trustItems,
  previewData,
}: HeroSectionProps): React.JSX.Element {
  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      {/* Static gradient background */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div
          className="absolute -left-[20%] -top-[20%] h-[60%] w-[60%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -right-[10%] top-[20%] h-[50%] w-[50%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] sm:px-6">
        <div className="space-y-6">
          <StaticBadge>Built for modern finance operations</StaticBadge>

          <h1 className={cn(displayFont.className, "max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl")}>
            <span className="text-gradient">Expense control</span> for teams that need speed, clarity, and confidence
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground">
            SpendScope delivers expense control for modern teams with streamlined workflows,
            policy guidance, and analytics visibility. Teams gain speed, clarity, and
            confidence from raw spending data through final decisions.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-brand border-0 text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
            >
              <Link href="/signup">
                Create Free Workspace
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="glass-card">
              <Link href="#tour">
                See Product Tour
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">No credit card required for Free tier.</p>

          <div className="grid gap-2 sm:grid-cols-2">
            {trustItems.map((item) => {
              const Icon = iconMap[item.iconName];
              if (!Icon) return null;
              return <StaticTrustItem key={item.title} icon={Icon} title={item.title} />;
            })}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-[560px]">
            <MobileHeroPreview
              totalAmount={previewData.summary.totalAmount}
              totalCount={previewData.summary.totalCount}
              userCount={previewData.userSpending.length}
              monthlyTrend={previewData.monthlyTrend}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Enhanced hero content - with framer-motion animations (lazy loaded)
function EnhancedHeroContent({
  trustItems,
  previewData,
  allowEnhancedMotion,
}: HeroSectionProps & { allowEnhancedMotion: boolean }): React.JSX.Element {
  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      <MeshGradient className="-z-20" />
      {allowEnhancedMotion && (
        <ParticleField className="-z-10" particleCount={25} color="rgba(99, 102, 241, 0.3)" />
      )}

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] sm:px-6">
        <div className="space-y-6">
          <TextReveal delay={0.1}>
            <StaticBadge>Built for modern finance operations</StaticBadge>
          </TextReveal>

          <TextReveal delay={0.2} type="fade-up">
            <h1 className={cn(displayFont.className, "max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl")}>
              <span className="text-gradient">Expense control</span> for teams that need speed, clarity, and confidence
            </h1>
          </TextReveal>

          <TextReveal delay={0.3} type="fade-up">
            <p className="max-w-2xl text-lg text-muted-foreground">
              SpendScope delivers expense control for modern teams with streamlined workflows,
              policy guidance, and analytics visibility. Teams gain speed, clarity, and
              confidence from raw spending data through final decisions.
            </p>
          </TextReveal>

          <StaggerContainer className="flex flex-wrap gap-3" staggerDelay={0.1} delayChildren={0.4}>
            <StaggerItem>
              <Button
                asChild
                size="lg"
                className="bg-gradient-brand border-0 text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
              >
                <Link href="/signup">
                  Create Free Workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </StaggerItem>
            <StaggerItem>
              <Button asChild size="lg" variant="outline" className="glass-card">
                <Link href="#tour">
                  See Product Tour
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </StaggerItem>
          </StaggerContainer>

          <TextReveal delay={0.6} type="fade-up">
            <p className="text-sm text-muted-foreground">No credit card required for Free tier.</p>
          </TextReveal>

          <StaggerContainer className="grid gap-2 sm:grid-cols-2" staggerDelay={0.1} delayChildren={0.7}>
            {trustItems.map((item) => {
              const Icon = iconMap[item.iconName];
              if (!Icon) return null;
              return (
                <StaggerItem key={item.title}>
                  <StaticTrustItem icon={Icon} title={item.title} />
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>

        <TextReveal delay={0.5} type="fade-up" className="flex items-center justify-center">
          <TiltCard
            className="w-full max-w-[560px]"
            tiltAmount={8}
            showGlow={allowEnhancedMotion}
            glowColor="rgba(99, 102, 241, 0.2)"
          >
            <div className="space-y-3 rounded-2xl border border-indigo-200/60 bg-slate-50/70 p-3 shadow-2xl shadow-indigo-950/10 dark:border-indigo-900/40 dark:bg-slate-950/60">
              <SummaryCards
                totalAmount={previewData.summary.totalAmount}
                totalCount={previewData.summary.totalCount}
                userCount={previewData.userSpending.length}
                monthlyTrend={previewData.monthlyTrend}
                motionPolicy={allowEnhancedMotion ? "enhanced" : "static"}
              />
              <DesktopMonthlyTrendChart data={previewData.monthlyTrend} motionPolicy="none" />
            </div>
          </TiltCard>
        </TextReveal>
      </div>
    </section>
  );
}

export function HeroSection({
  trustItems,
  previewData,
}: HeroSectionProps): React.JSX.Element {
  const { allowEnhancedMotion, useMobileOptimizedContent } = useMarketingDeviceProfile();

  // On mobile, render static content immediately without loading framer-motion
  if (useMobileOptimizedContent) {
    return <StaticHeroContent trustItems={trustItems} previewData={previewData} />;
  }

  // On desktop, render enhanced content with animations
  return (
    <EnhancedHeroContent
      trustItems={trustItems}
      previewData={previewData}
      allowEnhancedMotion={allowEnhancedMotion}
    />
  );
}
