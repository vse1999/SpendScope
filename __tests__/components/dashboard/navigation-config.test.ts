import { UserRole } from "@prisma/client"

import {
  DASHBOARD_PRIMARY_NAV_ITEMS,
  filterDashboardNavigationByRole,
  getDashboardPageTitle,
  getDashboardRouteLabel,
  isDashboardRouteActive,
} from "@/components/dashboard/navigation-config"

describe("dashboard navigation config", () => {
  it("filters admin-only navigation for members", () => {
    const memberItems = filterDashboardNavigationByRole(
      DASHBOARD_PRIMARY_NAV_ITEMS,
      UserRole.MEMBER
    )

    expect(memberItems.map((item) => item.href)).toEqual([
      "/dashboard",
      "/dashboard/expenses",
      "/dashboard/analytics",
    ])
  })

  it("keeps admin-only navigation for admins", () => {
    const adminItems = filterDashboardNavigationByRole(
      DASHBOARD_PRIMARY_NAV_ITEMS,
      UserRole.ADMIN
    )

    expect(adminItems.map((item) => item.href)).toContain("/dashboard/team")
  })

  it("marks the dashboard route as active only on the exact dashboard path", () => {
    expect(isDashboardRouteActive("/dashboard", "/dashboard")).toBe(true)
    expect(isDashboardRouteActive("/dashboard/expenses", "/dashboard")).toBe(false)
  })

  it("marks nested dashboard pages as active for section roots", () => {
    expect(
      isDashboardRouteActive("/dashboard/expenses/receipts", "/dashboard/expenses")
    ).toBe(true)
  })

  it("resolves dashboard page titles from the shared route labels", () => {
    expect(getDashboardPageTitle("/dashboard")).toBe("Dashboard")
    expect(getDashboardPageTitle("/dashboard/team")).toBe("Team Members")
    expect(getDashboardPageTitle("/dashboard/custom-report")).toBe("Custom Report")
    expect(getDashboardRouteLabel("analytics")).toBe("Analytics")
  })
})
