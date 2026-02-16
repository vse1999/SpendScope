import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe, isBillingEnabled, PRICE_IDS } from "@/lib/stripe/config"
import { NextResponse } from "next/server"
import { createApiRouteContext, logApiError, logApiInfo, withRequestIdHeader } from "@/lib/monitoring/api-route"

const CHECKOUT_ROUTE = "/api/stripe/checkout";

export async function POST(request: Request): Promise<Response> {
  const routeContext = createApiRouteContext(request, CHECKOUT_ROUTE);

  try {
    // Check if billing is enabled
    if (!isBillingEnabled()) {
      return withRequestIdHeader(NextResponse.json(
        { error: "Billing is not enabled in development mode" },
        { status: 400 }
      ), routeContext)
    }

    const session = await auth()

    if (!session?.user) {
      return withRequestIdHeader(
        NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
        routeContext
      )
    }

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    })

    if (!user?.company) {
      return withRequestIdHeader(NextResponse.json(
        { error: "User not associated with a company" },
        { status: 400 }
      ), routeContext)
    }

    // Check if user is admin
    if (user.role !== "ADMIN") {
      return withRequestIdHeader(NextResponse.json(
        { error: "Only admins can manage billing" },
        { status: 403 }
      ), routeContext)
    }

    // Get or create Stripe customer
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: user.company.id },
    })

    if (subscription?.stripeSubId && subscription.status !== "CANCELED") {
      return withRequestIdHeader(NextResponse.json(
        { error: "Company already has an active subscription" },
        { status: 409 }
      ), routeContext)
    }

    let customerId = subscription?.stripeCustomerId

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: user.company.name,
        metadata: {
          companyId: user.company.id,
          userId: session.user.id,
        },
      })
      customerId = customer.id

      // Update subscription record
      await prisma.subscription.update({
        where: { companyId: user.company.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create checkout session with test-friendly settings
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: PRICE_IDS.PRO_MONTHLY,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
      subscription_data: {
        // Optional: Add trial period for testing
        // trial_period_days: 14,
        metadata: {
          companyId: user.company.id,
        },
      },
      // Collect tax ID if needed
      // tax_id_collection: {enabled: true},
      // Allow promotion codes for testing discounts
      allow_promotion_codes: true,
      // Billing address collection (optional)
      billing_address_collection: "auto",
    })

    logApiInfo("Created Stripe checkout session", routeContext, {
      companyId: user.company.id,
      userId: session.user.id,
    });
    return withRequestIdHeader(NextResponse.json({ url: checkoutSession.url }), routeContext)
  } catch (error) {
    logApiError("Failed to create checkout session", error, routeContext);
    return withRequestIdHeader(NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    ), routeContext)
  }
}
