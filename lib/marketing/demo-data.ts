import type { AnalyticsData } from "@/types/analytics";
import { DEMO_USERS } from "@/lib/demo/config";

const [demoAdmin, demoMemberSarah, demoMemberMichael, demoMemberEmily, demoMemberJames] =
  DEMO_USERS;

export const MARKETING_ANALYTICS_DATA: AnalyticsData = {
  summary: {
    totalAmount: 27_734.78,
    totalCount: 60,
    averageExpense: 462.25,
    startDate: "2025-09-01",
    endDate: "2026-02-18",
  },
  monthlyTrend: [
    { month: "Sep", amount: 2_894.32, monthKey: "2025-09" },
    { month: "Oct", amount: 3_271.54, monthKey: "2025-10" },
    { month: "Nov", amount: 3_608.11, monthKey: "2025-11" },
    { month: "Dec", amount: 4_182.67, monthKey: "2025-12" },
    { month: "Jan", amount: 5_640.41, monthKey: "2026-01" },
    { month: "Feb", amount: 8_137.73, monthKey: "2026-02" },
  ],
  categoryDistribution: [
    { name: "Travel", color: "#10b981", amount: 16_130.18 },
    { name: "Equipment", color: "#ef4444", amount: 6_429.66 },
    { name: "Software", color: "#8b5cf6", amount: 2_364.14 },
    { name: "Meals", color: "#f59e0b", amount: 1_519.3 },
    { name: "Office Supplies", color: "#3b82f6", amount: 1_291.5 },
  ],
  userSpending: [
    {
      name: demoAdmin.name,
      email: demoAdmin.email,
      amount: 14_690.94,
      count: 34,
    },
    {
      name: demoMemberSarah.name,
      email: demoMemberSarah.email,
      amount: 3_703.06,
      count: 6,
    },
    {
      name: demoMemberMichael.name,
      email: demoMemberMichael.email,
      amount: 3_510.16,
      count: 9,
    },
    {
      name: demoMemberJames.name,
      email: demoMemberJames.email,
      amount: 3_168.92,
      count: 6,
    },
    {
      name: demoMemberEmily.name,
      email: demoMemberEmily.email,
      amount: 2_661.7,
      count: 5,
    },
  ],
};
