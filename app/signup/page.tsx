import type { Metadata } from "next";
import Link from "next/link";

import { GitHubSignInButton, GoogleSignInButton } from "@/components/blocks/auth/oauth-buttons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildOnboardingUrl, parsePricingIntent, sanitizeRedirectTo } from "@/lib/auth/redirect-intent";

export const metadata: Metadata = {
  title: "Create Workspace",
  description: "Create a SpendScope workspace with Google or GitHub and finish setup in onboarding.",
};

interface SignupPageProps {
  readonly searchParams: Promise<{
    plan?: string
    redirectTo?: string
  }>
}

export default async function SignupPage({
  searchParams,
}: SignupPageProps): Promise<React.JSX.Element> {
  const params = await searchParams
  const redirectTo = sanitizeRedirectTo(params.redirectTo)
  const pricingIntent = parsePricingIntent(params.plan)
  const onboardingRedirectTo = buildOnboardingUrl({
    pricingIntent,
    redirectTo,
  })
  const selectedPlanLabel = pricingIntent === "pro" ? "Pro workspace setup" : "Free workspace setup"

  return (
    <main className="min-h-screen app-shell px-4 py-10 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,28rem)]">
          <section className="space-y-6">
            <Badge
              variant="secondary"
              className="w-fit border-indigo-200/70 bg-indigo-50/80 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              {selectedPlanLabel}
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Create a workspace for finance, ops, and team spend review
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Sign in with Google or GitHub, then finish onboarding to create or join the
                workspace your team uses for expenses, policy review, billing, and role-based access.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="app-card">
                <CardContent className="space-y-2 p-5">
                  <p className="text-sm font-medium">Capture team spend</p>
                  <p className="text-sm text-muted-foreground">
                    Move expense tracking out of scattered spreadsheets and chat threads.
                  </p>
                </CardContent>
              </Card>
              <Card className="app-card">
                <CardContent className="space-y-2 p-5">
                  <p className="text-sm font-medium">Review policy risk</p>
                  <p className="text-sm text-muted-foreground">
                    Spot category drift, unusual spikes, and budget pressure before month-end.
                  </p>
                </CardContent>
              </Card>
              <Card className="app-card">
                <CardContent className="space-y-2 p-5">
                  <p className="text-sm font-medium">Keep ownership clear</p>
                  <p className="text-sm text-muted-foreground">
                    Invite teammates, manage roles, and keep billing access in one place.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <Card className="app-card-strong">
            <CardHeader className="space-y-3">
              <div className="space-y-2">
                <CardTitle className="text-2xl">Continue with your identity provider</CardTitle>
                <CardDescription className="text-sm">
                  This will take you into workspace onboarding, where you can create a new company
                  workspace or join an existing one.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <GoogleSignInButton redirectTo={onboardingRedirectTo} />
                <GitHubSignInButton redirectTo={onboardingRedirectTo} />
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">What happens next</p>
                <p className="mt-2">
                  1. Authenticate with Google or GitHub.
                </p>
                <p>2. Create or join your team workspace.</p>
                <p>3. Land in SpendScope ready to review and manage spend.</p>
              </div>

              <div className="text-sm text-muted-foreground">
                Already have a workspace?{" "}
                <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-medium text-foreground underline underline-offset-4">
                  Sign in instead
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
