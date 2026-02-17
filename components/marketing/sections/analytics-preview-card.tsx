"use client";

import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

interface CategoryBar {
  readonly label: string;
  readonly share: number;
  readonly amount: string;
  readonly color: string;
}

const categoryBars: readonly CategoryBar[] = [
  { label: "Software", share: 31, amount: "$8.3k", color: "#6366f1" },
  { label: "Operations", share: 24, amount: "$6.4k", color: "#8b5cf6" },
  { label: "Travel", share: 18, amount: "$4.8k", color: "#06b6d4" },
  { label: "Workplace", share: 15, amount: "$4.0k", color: "#f59e0b" },
  { label: "Equipment", share: 12, amount: "$3.2k", color: "#ef4444" },
];

export function AnalyticsPreviewCard(): ReactElement {
  return (
    <Card className="w-full border-indigo-200/60 bg-white/90 shadow-2xl shadow-indigo-950/10 backdrop-blur-sm dark:border-indigo-900/40 dark:bg-slate-950/85">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="border-indigo-300/70 text-indigo-700 dark:text-indigo-300"
          >
            Product Preview
          </Badge>
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-2 dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <p className="text-muted-foreground">Total Spent</p>
            <p className="mt-1 font-semibold text-foreground">$26.8k</p>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-2 dark:border-violet-900/50 dark:bg-violet-950/30">
            <p className="text-muted-foreground">Avg Expense</p>
            <p className="mt-1 font-semibold text-foreground">$142</p>
          </div>
          <div className="rounded-lg border border-cyan-200 bg-cyan-50/80 p-2 dark:border-cyan-900/50 dark:bg-cyan-950/30">
            <p className="text-muted-foreground">Team Members</p>
            <p className="mt-1 font-semibold text-foreground">12</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950 p-3 dark:border-indigo-900/40">
          <svg
            viewBox="0 0 360 188"
            role="img"
            aria-label="Expense and forecast trend chart"
            className="h-auto w-full"
          >
            <defs>
              <linearGradient id="gridOverlay" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="trendFillPrimary" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="trendFillSecondary" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
              </linearGradient>
              <filter id="glowPrimary" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width="360" height="188" fill="url(#gridOverlay)" />
            {Array.from({ length: 5 }).map((_, index) => {
              const y = 30 + index * 32;
              return (
                <line
                  key={`row-${y}`}
                  x1="14"
                  y1={y}
                  x2="346"
                  y2={y}
                  stroke="#94a3b8"
                  strokeOpacity="0.16"
                  strokeWidth="1"
                />
              );
            })}
            {Array.from({ length: 7 }).map((_, index) => {
              const x = 24 + index * 52;
              return (
                <line
                  key={`col-${x}`}
                  x1={x}
                  y1="16"
                  x2={x}
                  y2="170"
                  stroke="#94a3b8"
                  strokeOpacity="0.1"
                  strokeWidth="1"
                />
              );
            })}

            <path
              d="M18 145 L70 134 L122 124 L174 110 L226 102 L278 84 L330 67 L330 170 L18 170 Z"
              fill="url(#trendFillSecondary)"
            />
            <path
              d="M18 150 L70 142 L122 131 L174 118 L226 108 L278 90 L330 70 L330 170 L18 170 Z"
              fill="url(#trendFillPrimary)"
            />
            <path
              d="M18 145 L70 134 L122 124 L174 110 L226 102 L278 84 L330 67"
              stroke="#06b6d4"
              strokeOpacity="0.9"
              strokeWidth="2.25"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 150 L70 142 L122 131 L174 118 L226 108 L278 90 L330 70"
              stroke="#6366f1"
              strokeWidth="3"
              fill="none"
              filter="url(#glowPrimary)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[18, 70, 122, 174, 226, 278, 330].map((x, index) => {
              const primaryY = [150, 142, 131, 118, 108, 90, 70][index];
              return (
                <g key={`dot-${x}`}>
                  <circle cx={x} cy={primaryY} r="4" fill="#0f172a" />
                  <circle cx={x} cy={primaryY} r="2.5" fill="#6366f1" />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-2">
          {categoryBars.map((bar) => (
            <div key={bar.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: bar.color }}
                  />
                  {bar.label}
                </span>
                <span>
                  {bar.amount} ({bar.share}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-200/70 dark:bg-slate-800/70">
                <div
                  className="h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.14)] transition-all duration-1000"
                  style={{
                    width: `${bar.share}%`,
                    background: `linear-gradient(90deg, ${bar.color}CC 0%, ${bar.color} 100%)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
