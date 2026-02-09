import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { UserRole } from "@prisma/client"
import { getUserCompany } from "@/app/actions/companies"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { NotificationProvider } from "@/components/notifications/notification-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch company data for sidebar display
  const userCompanyResult = await getUserCompany()
  
  // Extract company data
  const companyData = userCompanyResult.hasCompany && "company" in userCompanyResult
    ? userCompanyResult.company
    : null
  
  const company = companyData ? {
    id: companyData.id,
    name: companyData.name,
  } : null

  // Build user object in the format expected by the sidebar
  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: session.user.role || UserRole.MEMBER,
    company,
  }

  // Read sidebar state cookie for consistent server/client rendering
  const cookieStore = await cookies()
  const sidebarState = cookieStore.get("sidebar_state")
  const sidebarOpen = sidebarState?.value !== "false"

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background">
        <DashboardSidebar user={user} defaultOpen={sidebarOpen}>
          <div className="flex flex-col min-h-screen w-full">
            {/* Header with breadcrumbs - Desktop only (mobile handled by sidebar) */}
            <DashboardHeader 
              user={user}
            />
            
            {/* Page Content */}
            <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </DashboardSidebar>
      </div>
    </NotificationProvider>
  )
}
