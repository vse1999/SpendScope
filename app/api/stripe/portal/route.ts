import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe, isBillingEnabled } from "@/lib/stripe/config"
import { NextResponse } from "next/server"

export async function POST(): Promise<NextResponse> {
  try {
    if (!isBillingEnabled()) {
      return NextResponse.json(
        { error: "Billing is not enabled" },
        { status: 400 }
      )
    }

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: { include: { subscription: true } } },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can manage billing" },
        { status: 403 }
      )
    }

    if (!user.company?.subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      )
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.company.subscription.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("Portal error:", error)
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    )
  }
}
