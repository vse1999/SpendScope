import { cookies } from "next/headers"
import type { Metadata } from "next"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import { requireDashboardRequestContext } from "@/lib/dashboard/request-context"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await requireDashboardRequestContext()
  const { user } = context

  // Read sidebar state cookie for consistent server/client rendering
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get("sidebar_state")
  const sidebarOpen = sidebarState?.value !== "false"

  return (
    <NotificationProvider>
      <div id="dashboard-root" className="min-h-screen min-w-0 app-shell" suppressHydrationWarning>
        <DashboardSidebar user={user} defaultOpen={sidebarOpen}>
          <div className="flex min-h-screen w-full min-w-0 flex-col">
            {/* Header with breadcrumbs - Desktop only (mobile handled by sidebar) */}
            <DashboardHeader
              user={user}
            />

            {/* Page Content */}
            <div className="flex-1 w-full min-w-0 p-4 md:p-6 lg:p-8">
              <div className="mx-auto w-full min-w-0 max-w-7xl">
                {children}
              </div>
            </div>
          </div>
        </DashboardSidebar>
      </div>
    </NotificationProvider>
  )
}
