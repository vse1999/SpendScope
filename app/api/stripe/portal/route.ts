import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe, isBillingEnabled } from "@/lib/stripe/config"
import { NextResponse } from "next/server"
import { createApiRouteContext, logApiError, logApiInfo, withRequestIdHeader } from "@/lib/monitoring/api-route"

const PORTAL_ROUTE = "/api/stripe/portal";

export async function POST(request: Request): Promise<Response> {
  const routeContext = createApiRouteContext(request, PORTAL_ROUTE);

  try {
    if (!isBillingEnabled()) {
      return withRequestIdHeader(NextResponse.json(
        { error: "Billing is not enabled" },
        { status: 400 }
      ), routeContext)
    }

    const session = await auth()

    if (!session?.user?.id) {
      return withRequestIdHeader(
        NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
        routeContext
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: { include: { subscription: true } } },
    })

    if (!user) {
      return withRequestIdHeader(NextResponse.json({ error: "User not found" }, { status: 404 }), routeContext)
    }

    if (user.role !== "ADMIN") {
      return withRequestIdHeader(NextResponse.json(
        { error: "Only admins can manage billing" },
        { status: 403 }
      ), routeContext)
    }

    if (!user.company?.subscription?.stripeCustomerId) {
      return withRequestIdHeader(NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      ), routeContext)
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.company.subscription.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
    })

    logApiInfo("Created Stripe billing portal session", routeContext, {
      companyId: user.company.id,
      userId: session.user.id,
    });
    return withRequestIdHeader(NextResponse.json({ url: portalSession.url }), routeContext)
  } catch (error) {
    logApiError("Failed to create portal session", error, routeContext);
    return withRequestIdHeader(NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    ), routeContext)
  }
}
