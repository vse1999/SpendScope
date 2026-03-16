import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAllCompanies, getUserCompany } from "@/app/actions/companies"
import { CompanyWelcome, CompanySelector, FeatureHighlights } from "@/components/features/onboarding"
import { sanitizeRedirectTo } from "@/lib/auth/redirect-intent"

interface OnboardingPageProps {
  readonly searchParams: Promise<{
    redirectTo?: string
  }>
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const params = await searchParams
  const redirectTo = sanitizeRedirectTo(params.redirectTo)

  const userCompanyResult = await getUserCompany()
  if (userCompanyResult.hasCompany) redirect(redirectTo)

  const companies = await getAllCompanies()
  const companyList = "error" in companies ? [] : companies

  return (
    <div className="min-h-screen app-shell p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <CompanyWelcome userName={session.user.name} />
        <CompanySelector companies={companyList} redirectTo={redirectTo} />
        <FeatureHighlights />

        <div className="text-center">
          <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <span>Not {session.user.email}?</span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-primary hover:underline p-0 m-0 bg-transparent border-0"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
