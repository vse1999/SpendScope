import Link from "next/link";
import { ArrowRight, ChevronRight, Layers3, LockKeyhole, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileHeroPreview } from "@/components/marketing/sections/mobile-hero-preview";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/types/analytics";

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

function TrustItemPill({ icon: Icon, title }: { icon: LucideIcon; title: string }): ReactElement {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white/50 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm dark:bg-slate-950/50">
      <Icon className="size-4 text-indigo-600 dark:text-indigo-400" />
      <span>{title}</span>
    </div>
  );
}

export function HeroSection({ trustItems, previewData }: HeroSectionProps): ReactElement {
  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div
          className="absolute -left-[20%] -top-[20%] h-[60%] w-[60%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -right-[10%] top-[20%] h-[50%] w-[50%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[10%] left-[10%] h-[40%] w-[40%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] sm:px-6">
        <div className="space-y-6">
          <Badge
            variant="secondary"
            className="w-fit border-indigo-200/70 bg-indigo-50/80 text-indigo-700 backdrop-blur-sm dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            <span className="mr-2 inline-block size-2 rounded-full bg-indigo-500" />
            Built for modern finance operations
          </Badge>

          <h1
            className={cn(
              displayFont.className,
              "max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
            )}
          >
            <span className="text-gradient">Expense control</span> for teams that
            need speed, clarity, and confidence
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground">
            SpendScope delivers expense control for modern teams with
            streamlined workflows, policy guidance, and analytics visibility.
            Teams gain speed, clarity, and confidence from raw spending data
            through final decisions.
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

          <p className="text-sm text-muted-foreground">
            No credit card required for Free tier.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {trustItems.map((item) => {
              const Icon = iconMap[item.iconName];
              if (!Icon) {
                return null;
              }

              return <TrustItemPill key={item.title} icon={Icon} title={item.title} />;
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
