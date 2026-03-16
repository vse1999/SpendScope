import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "./auth.config"

const RETIRED_TEST_API_PREFIXES = [
  "/api/test-login",
  "/api/test-logout",
  "/api/rate-limit-test",
] as const

// Node.js runtime proxy (formerly middleware)
// Next.js 16+: proxy runs on Node.js runtime only (no Edge)
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  const isApiRoute = pathname.startsWith("/api")
  const isRetiredTestApiRoute = RETIRED_TEST_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/invite/accept")
  const isPublicApiRoute =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe/webhooks")
  const isPublicPage = pathname === "/"
  const isStaticFile = pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")

  // Allow static files and public pages
  if (isStaticFile || isPublicPage) {
    return NextResponse.next()
  }

  if (isRetiredTestApiRoute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // API endpoints should return HTTP errors instead of redirect responses.
  if (isApiRoute) {
    if (isPublicApiRoute) {
      return NextResponse.next()
    }

    if (!isLoggedIn) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.next()
  }

  // Redirect logged-in users away from login page only
  // Note: onboarding is accessible to logged-in users (they might need to select/create company)
  if ((pathname.startsWith("/login") || pathname.startsWith("/signup")) && isLoggedIn) {
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
