"use client";

import { motion } from "framer-motion";
import { TrendingUp, PieChart, Users } from "lucide-react";
import { formatCurrency } from "@/lib/format-utils";
import type { MonthlyTrend } from "@/types/analytics";

interface SummaryCardsProps {
  readonly totalAmount: number;
  readonly totalCount: number;
  readonly userCount: number;
  readonly monthlyTrend: readonly MonthlyTrend[];
}

interface StatCardProps {
  readonly title: string;
  readonly value: string;
  readonly subtitle: string;
  readonly icon: React.ReactNode;
  readonly gradient: string;
  readonly delay: number;
}

function StatCard({ title, value, subtitle, icon, gradient, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-xl border border-indigo-200/70 bg-white/90 p-3 shadow-lg backdrop-blur-sm dark:border-indigo-900/50 dark:bg-slate-900/90"
    >
      <div className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-md`}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-0.5 text-lg font-bold tracking-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground">{subtitle}</p>
    </motion.div>
  );
}

export function SummaryCards({ totalAmount, totalCount, userCount, monthlyTrend }: SummaryCardsProps) {
  const latestMonth = monthlyTrend[monthlyTrend.length - 1];
  const previousMonth = monthlyTrend[monthlyTrend.length - 2];
  const thisMonthAmount = latestMonth?.amount ?? 0;
  const monthOverMonthChangeText =
    previousMonth && previousMonth.amount > 0
      ? `${thisMonthAmount >= previousMonth.amount ? "+" : ""}${(
          ((thisMonthAmount - previousMonth.amount) / previousMonth.amount) *
          100
        ).toFixed(1)}% vs last month`
      : "No baseline yet";

  return (
    <div className="grid grid-cols-3 gap-2">
      <StatCard
        title="Total Spent"
        value={formatCurrency(totalAmount)}
        subtitle={`${totalCount} expenses`}
        icon={<TrendingUp className="h-3.5 w-3.5 text-white" />}
        gradient="from-blue-500 to-blue-600"
        delay={0.6}
      />
      <StatCard
        title="This Month"
        value={formatCurrency(thisMonthAmount)}
        subtitle={monthOverMonthChangeText}
        icon={<PieChart className="h-3.5 w-3.5 text-white" />}
        gradient="from-emerald-500 to-emerald-600"
        delay={0.7}
      />
      <StatCard
        title="Team Members"
        value={userCount.toString()}
        subtitle="Active contributors"
        icon={<Users className="h-3.5 w-3.5 text-white" />}
        gradient="from-violet-500 to-violet-600"
        delay={0.8}
      />
    </div>
  );
}
