import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "./auth.config"

// Node.js runtime proxy (formerly middleware)
// Next.js 16+: proxy runs on Node.js runtime only (no Edge)
const { auth } = NextAuth(authConfig)

function areTestEndpointsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_ENDPOINTS === "true"
  )
}

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  const testEndpointsEnabled = areTestEndpointsEnabled()

  // Auth pages (login and onboarding) - accessible when logged in
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/invite/accept")
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe/webhooks") ||
    (testEndpointsEnabled && pathname.startsWith("/api/test-login")) ||
    (testEndpointsEnabled && pathname.startsWith("/api/test-logout"))
  const isStaticFile = pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")

  // Allow static files and public pages
  if (isStaticFile || isPublicPage) {
    return NextResponse.next()
  }

  // Redirect logged-in users away from login page only
  // Note: onboarding is accessible to logged-in users (they might need to select/create company)
  if (pathname.startsWith("/login") && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Redirect non-logged-in users to login page
  // Note: onboarding requires authentication
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // IMPORTANT: We DON'T check for companyId here because:
  // 1. The JWT token might be stale (not updated after onboarding)
  // 2. The dashboard page queries the database directly for company info
  // 3. This prevents redirect loops between /dashboard and /onboarding

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
}
