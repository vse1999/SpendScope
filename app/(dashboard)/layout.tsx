import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import { getUserCompany } from "@/app/actions/companies"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardSidebar user={user}>
        <div className="flex flex-col min-h-screen">
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
  )
}
