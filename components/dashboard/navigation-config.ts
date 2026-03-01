import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
} from "lucide-react"
import { UserRole } from "@prisma/client"

export interface DashboardNavItem {
  readonly title: string
  readonly href: string
  readonly icon: LucideIcon
  readonly adminOnly?: boolean
  readonly proOnly?: boolean
  readonly badge?: string
}

export const DASHBOARD_ROUTE_LABELS: Readonly<Record<string, string>> = {
  dashboard: "Dashboard",
  expenses: "Expenses",
  categories: "Categories",
  analytics: "Analytics",
  team: "Team Members",
  billing: "Billing",
  settings: "Settings",
  profile: "Profile",
}

export const DASHBOARD_PRIMARY_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Expenses",
    href: "/dashboard/expenses",
    icon: Receipt,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Team",
    href: "/dashboard/team",
    icon: Users,
    adminOnly: true,
  },
]

export const DASHBOARD_SECONDARY_NAV_ITEMS: readonly DashboardNavItem[] = [
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
]

export function isDashboardAdminRole(userRole: string | UserRole): boolean {
  return userRole === UserRole.ADMIN
}

export function filterDashboardNavigationByRole(
  items: readonly DashboardNavItem[],
  userRole: string | UserRole
): DashboardNavItem[] {
  const isAdmin = isDashboardAdminRole(userRole)

  return items.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false
    }

    return true
  })
}

export function isDashboardRouteActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname.startsWith(href)
}

export function getDashboardRouteLabel(segment: string): string {
  const fallbackLabel = segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

  return (
    DASHBOARD_ROUTE_LABELS[segment] ||
    fallbackLabel
  )
}

export function getDashboardPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length <= 1) {
    return DASHBOARD_ROUTE_LABELS.dashboard
  }

  return getDashboardRouteLabel(segments[segments.length - 1])
}
