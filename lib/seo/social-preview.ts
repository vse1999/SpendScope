export type SocialImageVariant =
  | "analytics"
  | "dashboard"
  | "expenses"
  | "home";

export interface SocialImageTheme {
  accentEnd: string;
  accentStart: string;
  backgroundEnd: string;
  backgroundStart: string;
  badgeText: string;
  description: string;
  title: string;
}

const FALLBACK_VARIANT: SocialImageVariant = "home";

const SOCIAL_IMAGE_THEMES: Record<SocialImageVariant, SocialImageTheme> = {
  analytics: {
    accentEnd: "#22d3ee",
    accentStart: "#0ea5e9",
    backgroundEnd: "#020617",
    backgroundStart: "#0f172a",
    badgeText: "SpendScope Analytics",
    description: "Trend insights, category intelligence, and team spending visibility.",
    title: "Portfolio-Ready Analytics Views",
  },
  dashboard: {
    accentEnd: "#22c55e",
    accentStart: "#16a34a",
    backgroundEnd: "#04120f",
    backgroundStart: "#0f2a24",
    badgeText: "SpendScope Dashboard",
    description: "Fast spend control with policy-aware summaries for every team.",
    title: "Real-Time Expense Command Center",
  },
  expenses: {
    accentEnd: "#f59e0b",
    accentStart: "#f97316",
    backgroundEnd: "#111827",
    backgroundStart: "#1f2937",
    badgeText: "SpendScope Expenses",
    description: "Filtered workflows, bulk actions, and clear ownership at scale.",
    title: "High-Throughput Expense Operations",
  },
  home: {
    accentEnd: "#2563eb",
    accentStart: "#38bdf8",
    backgroundEnd: "#020617",
    backgroundStart: "#1e293b",
    badgeText: "SpendScope",
    description: "Enterprise expense analytics with strong controls and measurable speed.",
    title: "Expense Control for Modern Teams",
  },
};

export function resolveSocialImageVariant(
  rawVariant: string | null | undefined
): SocialImageVariant {
  if (!rawVariant) {
    return FALLBACK_VARIANT;
  }

  const normalizedVariant = rawVariant.toLowerCase();
  if (normalizedVariant in SOCIAL_IMAGE_THEMES) {
    return normalizedVariant as SocialImageVariant;
  }

  return FALLBACK_VARIANT;
}

export function getSocialImageTheme(variant: SocialImageVariant): SocialImageTheme {
  return SOCIAL_IMAGE_THEMES[variant];
}
