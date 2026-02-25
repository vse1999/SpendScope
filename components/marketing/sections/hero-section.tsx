"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronRight, ShieldCheck, Layers3, LockKeyhole, Users, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonthlyTrendChart } from "@/components/analytics";
import { SummaryCards } from "./summary-cards";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { TextReveal, StaggerContainer, StaggerItem } from "@/components/marketing/animations";
import { TiltCard } from "@/components/marketing/animations";
import { MeshGradient, ParticleField } from "@/components/marketing/effects";
import type { AnalyticsData } from "@/types/analytics";

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

export function HeroSection({ trustItems, previewData }: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden">
      {/* Background Effects */}
      <MeshGradient className="-z-20" />
      <ParticleField 
        className="-z-10" 
        particleCount={25}
        color="rgba(99, 102, 241, 0.3)"
      />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] sm:px-6">
        {/* Left Column - Text Content */}
        <div className="space-y-6">
          <TextReveal delay={0.1}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Badge
                variant="secondary"
                className="w-fit border-indigo-200/70 bg-indigo-50/80 text-indigo-700 backdrop-blur-sm dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <motion.span
                  className="mr-2 inline-block size-2 rounded-full bg-indigo-500"
                  animate={shouldReduceMotion ? undefined : { 
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={shouldReduceMotion ? undefined : { duration: 2, repeat: Infinity }}
                />
                Built for modern finance operations
              </Badge>
            </motion.div>
          </TextReveal>

          <TextReveal delay={0.2} type="fade-up">
            <h1
              className={cn(
                displayFont.className,
                "max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
              )}
            >
              <span className="text-gradient">Expense control</span> for teams that need speed, clarity, and confidence
            </h1>
          </TextReveal>

          <TextReveal delay={0.3} type="fade-up">
            <p className="max-w-2xl text-lg text-muted-foreground">
              SpendScope combines streamlined expense workflows, policy guidance, and
              analytics visibility so companies can move from raw spending data to
              confident decisions.
            </p>
          </TextReveal>

          <StaggerContainer className="flex flex-wrap gap-3" staggerDelay={0.1} delayChildren={0.4}
          >
            <StaggerItem>
              <Button
                asChild
                size="lg"
                className="bg-gradient-brand border-0 text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
              >
                <Link href="/login?intent=signup">
                  Start Free
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
            <p className="text-sm text-muted-foreground">
              No credit card required for Free tier.
            </p>
          </TextReveal>

          <StaggerContainer className="grid gap-2 sm:grid-cols-2" staggerDelay={0.1} delayChildren={0.7}
          >
            {trustItems.map((item) => {
              const Icon = iconMap[item.iconName];
              if (!Icon) return null;
              
              return (
                <StaggerItem key={item.title}>
                  <motion.div
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white/50 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm dark:bg-slate-950/50"
                    whileHover={{ 
                      scale: 1.02, 
                      backgroundColor: "rgba(99, 102, 241, 0.05)",
                      borderColor: "rgba(99, 102, 241, 0.2)"
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{item.title}</span>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>

        {/* Right Column - Live Product Preview */}
        <TextReveal delay={0.5} type="fade-up" className="flex items-center justify-center"
        >
          <TiltCard 
            className="w-full max-w-[560px]"
            tiltAmount={8}
            showGlow={true}
            glowColor="rgba(99, 102, 241, 0.2)"
          >
            <div className="space-y-3 rounded-2xl border border-indigo-200/60 bg-slate-50/70 p-3 shadow-2xl shadow-indigo-950/10 dark:border-indigo-900/40 dark:bg-slate-950/60">
              <SummaryCards 
                totalAmount={previewData.summary.totalAmount}
                totalCount={previewData.summary.totalCount}
                userCount={previewData.userSpending.length}
                monthlyTrend={previewData.monthlyTrend}
              />
              <MonthlyTrendChart data={previewData.monthlyTrend} />
            </div>
          </TiltCard>
        </TextReveal>
      </div>
    </section>
  );
}
