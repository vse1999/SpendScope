import type { UpgradeFeature } from "./types";

interface UpgradeFeatureCopy {
  title: string;
  description: string;
  benefits: string[];
}

const UPGRADE_COPY: Record<UpgradeFeature, UpgradeFeatureCopy> = {
  analytics: {
    title: "Unlock Advanced Analytics",
    description: "Get deeper trend intelligence and richer decision signals for your team.",
    benefits: [
      "Long-range spending trend breakdowns",
      "Category and contributor analysis at scale",
      "Faster identification of budget drift",
    ],
  },
  csvExport: {
    title: "Export Reports with Pro",
    description: "Share clean data extracts for finance, operations, and compliance workflows.",
    benefits: [
      "One-click CSV export for filtered results",
      "Audit-friendly records for stakeholders",
      "Faster handoff to accounting tools",
    ],
  },
  teamInvites: {
    title: "Enable Team Collaboration",
    description: "Invite teammates and scale ownership with the Pro workspace model.",
    benefits: [
      "Invite members instantly",
      "Assign roles with clear accountability",
      "Coordinate reviews and approvals across teams",
    ],
  },
  userSeats: {
    title: "Scale Beyond Free Seat Limits",
    description: "Add teammates without seat caps so your workflow can grow with your company.",
    benefits: [
      "Unlimited team members on Pro",
      "No invite bottlenecks as you scale",
      "Shared visibility across finance and ops",
    ],
  },
  monthlyExpenses: {
    title: "Increase Monthly Expense Capacity",
    description: "Free plan limits monthly entries. Pro removes the cap for continuous tracking.",
    benefits: [
      "Unlimited monthly expense entries",
      "No disruption during high-activity months",
      "Consistent history for forecasting and audits",
    ],
  },
};

export function getUpgradeFeatureCopy(feature: UpgradeFeature): UpgradeFeatureCopy {
  return UPGRADE_COPY[feature];
}
