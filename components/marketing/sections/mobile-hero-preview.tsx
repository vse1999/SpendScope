"use client";

import { formatCurrency } from "@/lib/format-utils";
import type { MonthlyTrend } from "@/types/analytics";

interface MobileHeroPreviewProps {
  readonly totalAmount: number;
  readonly totalCount: number;
  readonly userCount: number;
  readonly monthlyTrend: readonly MonthlyTrend[];
}

function buildSparklinePoints(data: readonly MonthlyTrend[]): string {
  if (data.length === 0) {
    return "0,32 120,32 240,32";
  }

  const amounts = data.map((item) => item.amount);
  const maxAmount = Math.max(...amounts, 1);

  return amounts
    .map((amount, index) => {
      const x = data.length === 1 ? 120 : (index / (data.length - 1)) * 240;
      const y = 64 - (amount / maxAmount) * 48;
      return `${x},${Math.max(8, Math.min(64, y))}`;
    })
    .join(" ");
}

export function MobileHeroPreview({
  totalAmount,
  totalCount,
  userCount,
  monthlyTrend,
}: MobileHeroPreviewProps): React.JSX.Element {
  const latestMonth = monthlyTrend[monthlyTrend.length - 1];
  const sparklinePoints = buildSparklinePoints(monthlyTrend);

  return (
    <div className="space-y-3 rounded-2xl border border-indigo-200/60 bg-slate-50/85 p-3 shadow-xl shadow-indigo-950/10 dark:border-indigo-900/40 dark:bg-slate-950/70">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-indigo-100/80 bg-white/90 p-3 dark:border-indigo-900/40 dark:bg-slate-900/90">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <p className="mt-1 text-sm font-semibold">{formatCurrency(totalAmount)}</p>
          <p className="text-[10px] text-muted-foreground">{totalCount} expenses</p>
        </div>
        <div className="rounded-xl border border-indigo-100/80 bg-white/90 p-3 dark:border-indigo-900/40 dark:bg-slate-900/90">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Team
          </p>
          <p className="mt-1 text-sm font-semibold">{userCount}</p>
          <p className="text-[10px] text-muted-foreground">contributors</p>
        </div>
        <div className="rounded-xl border border-indigo-100/80 bg-white/90 p-3 dark:border-indigo-900/40 dark:bg-slate-900/90">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Latest
          </p>
          <p className="mt-1 text-sm font-semibold">
            {formatCurrency(latestMonth?.amount ?? 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {latestMonth?.month ?? "No data"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100/80 bg-white/90 p-3 dark:border-indigo-900/40 dark:bg-slate-900/90">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Monthly trend</p>
            <p className="text-[11px] text-muted-foreground">
              Lightweight mobile preview
            </p>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {monthlyTrend.length} months
          </p>
        </div>
        <svg
          viewBox="0 0 240 72"
          className="h-18 w-full"
          role="img"
          aria-label="Monthly spending sparkline"
        >
          <path
            d="M0 64 H240"
            className="stroke-border"
            strokeWidth="1"
            fill="none"
          />
          <polyline
            points={sparklinePoints}
            fill="none"
            stroke="var(--brand-indigo)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
