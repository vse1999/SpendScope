import { auth } from "@/auth"
import { getUsageStats } from "@/lib/stripe/subscription"
import { isBillingEnabled } from "@/lib/stripe/config"
import { getCachedUserCompany } from "@/lib/queries/get-user-company"
import { BillingClient } from "./billing-client"

export default async function BillingPage() {
  // session.user and company are guaranteed by (dashboard)/layout.tsx guards
  const session = await auth()
  const user = session!.user!

  const userCompany = await getCachedUserCompany()
  const companyId = userCompany.company!.id
  const isAdmin = user.role === "ADMIN"

  // Get usage stats
  const usage = await getUsageStats(companyId)
  const billingEnabled = isBillingEnabled()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-page-title">
          <span className="app-page-title-gradient">Billing</span>
        </h1>
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
