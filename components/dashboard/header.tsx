"use client"

import { usePathname } from "next/navigation"
import type { ReactElement } from "react"

import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs"
import { DashboardUserMenu } from "@/components/dashboard/dashboard-user-menu"
import { generateBreadcrumbs } from "@/components/dashboard/header-utils"
import type { DashboardHeaderProps } from "@/components/dashboard/header-types"
import { QuickActionsButton } from "@/components/dashboard/quick-actions-button"
import { NotificationsMenu } from "@/components/notifications/notifications-menu"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export function DashboardHeader({
  user,
}: DashboardHeaderProps): ReactElement {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center border-b border-border/40 bg-background px-4 lg:flex lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <DashboardBreadcrumbs breadcrumbs={breadcrumbs} />
      </div>

      <div className="flex items-center gap-0.5">
        <QuickActionsButton />

        <Separator
          orientation="vertical"
          className="mx-1.5 hidden h-4 sm:block"
        />

        <NotificationsMenu />

        <div className="hidden sm:block">
          <ThemeToggle showLabel />
        </div>

        <Separator orientation="vertical" className="mx-1.5 h-4" />

        <DashboardUserMenu user={user} />
      </div>
    </header>
  )
}
