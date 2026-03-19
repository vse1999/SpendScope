"use server"

import { redirect } from "next/navigation"

import { signIn } from "@/auth"
import { sanitizeRedirectTo } from "@/lib/auth/redirect-intent"
import { findDemoGuestUser } from "@/lib/demo/auth"
import { DEMO_GUEST_EMAIL, DEMO_LOGIN_PROVIDER_ID, isDemoEnabled } from "@/lib/demo/config"

type DemoLoginErrorCode = "CredentialsSignin" | "DemoDisabled" | "DemoUnavailable"

function isHandledDemoAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const errorType =
    "type" in error ? (error as { readonly type?: unknown }).type : undefined

  return errorType === "CredentialsSignin" || errorType === "CallbackRouteError"
}

function readRedirectTarget(formData: FormData): string {
  const redirectTo = formData.get("redirectTo")
  return sanitizeRedirectTo(typeof redirectTo === "string" ? redirectTo : undefined)
}

function buildDemoLoginErrorUrl(errorCode: DemoLoginErrorCode, redirectTo: string): string {
  const searchParams = new URLSearchParams({ error: errorCode })

  if (redirectTo !== "/dashboard") {
    searchParams.set("redirectTo", redirectTo)
  }

  return `/login?${searchParams.toString()}`
}

export async function signInAsDemo(formData: FormData): Promise<void> {
  const redirectTo = readRedirectTarget(formData)

  if (!isDemoEnabled()) {
    redirect(buildDemoLoginErrorUrl("DemoDisabled", redirectTo))
  }

  const demoUser = await findDemoGuestUser()
  if (!demoUser?.companyId) {
    redirect(buildDemoLoginErrorUrl("DemoUnavailable", redirectTo))
  }

  try {
    await signIn(DEMO_LOGIN_PROVIDER_ID, {
      email: DEMO_GUEST_EMAIL,
      redirectTo,
    })
  } catch (error: unknown) {
    if (isHandledDemoAuthError(error)) {
      redirect(buildDemoLoginErrorUrl("CredentialsSignin", redirectTo))
    }

    throw error
  }
}
