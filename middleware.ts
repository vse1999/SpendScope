import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "./auth.config"

// Edge-compatible auth (no database adapter)
const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isAuthPage = req.nextUrl.pathname.startsWith("/login")
    const isPublicPage = req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/api/auth")

    // Redirect logged-in users away from auth pages
    if (isAuthPage && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Redirect non-logged-in users to login page (except public pages)
    if (!isLoggedIn && !isAuthPage && !isPublicPage) {
        return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
}
