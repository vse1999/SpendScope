import { redirect } from "next/navigation";
import { buildLoginUrl, parsePricingIntent, sanitizeRedirectTo } from "@/lib/auth/redirect-intent";

interface SignupPageProps {
  readonly searchParams: Promise<{
    plan?: string
    redirectTo?: string
  }>
}

export default async function SignupPage({
  searchParams,
}: SignupPageProps): Promise<never> {
  const params = await searchParams
  const redirectTo = sanitizeRedirectTo(params.redirectTo)
  const pricingIntent = parsePricingIntent(params.plan)

  redirect(
    buildLoginUrl({
      intent: "signup",
      pricingIntent,
      redirectTo,
    })
  )
}
