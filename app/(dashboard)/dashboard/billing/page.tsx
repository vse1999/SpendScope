import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getUsageStats } from "@/lib/stripe/subscription"
import { isBillingEnabled } from "@/lib/stripe/config"
import { getUserCompany } from "@/app/actions/companies"
import { BillingClient } from "./billing-client"

export default async function BillingPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const userCompany = await getUserCompany()

  if (!userCompany.hasCompany || !userCompany.company) {
    redirect("/onboarding")
  }

  const companyId = userCompany.company.id
  const isAdmin = session.user.role === "ADMIN"

  // Get usage stats
  const usage = await getUsageStats(companyId)
  const billingEnabled = isBillingEnabled()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and usage
        </p>
      </div>

      <BillingClient
        usage={usage}
        isAdmin={isAdmin}
        billingEnabled={billingEnabled}
      />
    </div>
  )
}
