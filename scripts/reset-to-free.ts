/**
 * Script to reset subscription to FREE for testing upgrade flow
 * Run: npx tsx scripts/reset-to-free.ts
 */

import { prisma } from "@/lib/prisma"

async function resetToFree() {
  // Get company by slug or name
  const company = await prisma.company.findFirst({
    where: {
      // Change this to your company name/slug
      name: "Your Company Name",
    },
    include: { subscription: true }
  })

  if (!company) {
    console.log("❌ Company not found. Update the name in this script.")
    console.log("Available companies:")
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, slug: true }
    })
    companies.forEach(c => console.log(`  - ${c.name} (slug: ${c.slug})`))
    return
  }

  console.log(`Found company: ${company.name}`)

  // Reset to FREE
  await prisma.subscription.update({
    where: { companyId: company.id },
    data: {
      plan: "FREE",
      status: "ACTIVE",
      stripeSubId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
    }
  })

  console.log(`✅ Reset ${company.name} to FREE plan`)
  console.log("Refresh billing page to see 'Upgrade to Pro' button")
}

resetToFree()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
