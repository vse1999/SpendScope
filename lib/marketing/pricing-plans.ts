export type PricingPlanName = "Free" | "Pro";

export interface PricingPlanFeature {
  text: string;
  included: boolean;
}

export interface PricingPlanPresentation {
  name: PricingPlanName;
  description: string;
  price: string;
  period: string;
  badge: string;
  isPopular?: boolean;
  cta: string;
  features: PricingPlanFeature[];
}

export const PRICING_PLANS: PricingPlanPresentation[] = [
  {
    name: "Free",
    description: "For small teams that need immediate expense visibility",
    price: "$0",
    period: "forever",
    badge: "No card required",
    cta: "Get Started Free",
    features: [
      { text: "Up to 3 team members", included: true },
      { text: "Up to 100 expenses per month", included: true },
      { text: "Advanced analytics insights", included: false },
      { text: "CSV export", included: false },
      { text: "Team invites", included: false },
    ],
  },
  {
    name: "Pro",
    description: "For teams scaling controls, insights, and collaboration",
    price: "$29",
    period: "per month",
    isPopular: true,
    badge: "Most Popular",
    cta: "Start Pro",
    features: [
      { text: "Unlimited team members", included: true },
      { text: "Unlimited expenses", included: true },
      { text: "Advanced analytics insights", included: true },
      { text: "CSV export", included: true },
      { text: "Team invites", included: true },
    ],
  },
];
