import { UserRole } from "@prisma/client"

import {
  formatRole,
  generateBreadcrumbs,
  getInitials,
} from "@/components/dashboard/header-utils"

describe("header-utils", () => {
  it("builds dashboard breadcrumbs from the current pathname", () => {
    expect(generateBreadcrumbs("/dashboard/team")).toEqual([
      { label: "Dashboard", href: "/dashboard", isLast: false },
      { label: "Team Members", href: "/dashboard/team", isLast: true },
    ])
  })

  it("formats user initials safely", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL")
    expect(getInitials(undefined)).toBe("U")
  })

  it("formats known roles for display", () => {
    expect(formatRole(UserRole.ADMIN)).toBe("Admin")
    expect(formatRole(UserRole.MEMBER)).toBe("Member")
  })
})
