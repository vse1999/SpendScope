import { UserRole } from "@prisma/client"
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react"

import { getDashboardRouteLabel } from "@/components/dashboard/navigation-config"
import type { BreadcrumbItem, QuickAction } from "@/components/dashboard/header-types"

const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
}

export const ROLE_BADGE_VARIANTS: Record<
  UserRole,
  "default" | "secondary" | "outline" | "destructive"
> = {
  ADMIN: "default",
  MEMBER: "secondary",
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["home", "overview", "dashboard"],
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: CreditCard,
    keywords: ["expenses", "costs", "transactions"],
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    keywords: ["analytics", "reports", "insights"],
  },
  {
    label: "Account Settings",
    href: "/dashboard/settings",
    icon: Settings,
    keywords: ["profile", "account", "user", "settings"],
  },
  {
    label: "Team",
    href: "/dashboard/team",
    icon: Users,
    keywords: ["team", "members", "collaboration"],
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    keywords: ["billing", "subscription", "payment"],
  },
]

export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  let currentPath = ""
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`

    if (segment === "dashboard" && index === 0) {
      breadcrumbs.push({
        label: "Dashboard",
        href: "/dashboard",
        isLast: segments.length === 1,
      })
      return
    }

    const isLast = index === segments.length - 1
    const label = getDashboardRouteLabel(segment)

    breadcrumbs.push({
      label,
      href: currentPath,
      isLast,
    })
  })

  return breadcrumbs
}

export function getInitials(name: string | null | undefined): string {
  if (!name) {
    return "U"
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function formatRole(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role
}
