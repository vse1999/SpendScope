/**
 * Analytics data types
 */

export interface MonthlyTrend {
  month: string
  amount: number
  monthKey: string
}

export interface CategoryDistribution {
  name: string
  color: string
  amount: number
}

export interface UserSpending {
  name: string
  email: string
  amount: number
  count: number
}

export interface AnalyticsSummary {
  totalAmount: number
  totalCount: number
  averageExpense: number
  startDate: string
  endDate: string
}

export interface AnalyticsData {
  monthlyTrend: MonthlyTrend[]
  categoryDistribution: CategoryDistribution[]
  userSpending: UserSpending[]
  summary: AnalyticsSummary
}

// Recharts tooltip payload type
export interface RechartsTooltipPayload<T> {
  payload: T
  value: number
  name: string
}

// Recharts click event type for BarChart
export interface RechartsBarClickEvent {
  name: string
  email: string
  amount: number
  count: number
}

