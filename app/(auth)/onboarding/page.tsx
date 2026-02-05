import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAllCompanies, getUserCompany } from "@/app/actions/companies"
import { CompanyWelcome, CompanySelector, FeatureHighlights } from "@/components/features/onboarding"

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userCompanyResult = await getUserCompany()
  if (userCompanyResult.hasCompany) redirect("/dashboard")

  const companies = await getAllCompanies()
  const companyList = "error" in companies ? [] : companies

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <CompanyWelcome userName={session.user.name} />
        <CompanySelector companies={companyList} />
        <FeatureHighlights />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Not {session.user.email}?{" "}
            <form action="/api/auth/signout" method="POST" className="inline">
              <button type="submit" className="text-primary hover:underline">
                Sign out
              </button>
            </form>
          </p>
        </div>
      </div>
    </div>
  )
}
