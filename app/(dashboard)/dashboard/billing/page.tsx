import { getUsageStats } from "@/lib/stripe/subscription"
import { isBillingEnabled } from "@/lib/stripe/config"
import { getCachedUserCompany } from "@/lib/queries/get-user-company"
import { BillingClient } from "./billing-client"

export default async function BillingPage() {
  const userCompany = await getCachedUserCompany()
  const companyId = userCompany.company!.id
  const isAdmin = userCompany.hasCompany ? userCompany.userRole === "ADMIN" : false

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
