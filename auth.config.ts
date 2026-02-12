import type { NextAuthConfig } from "next-auth"

// Define role type locally for Edge compatibility
// Must match Prisma schema: enum UserRole { ADMIN MEMBER }
type UserRole = "ADMIN" | "MEMBER"

// Edge-compatible auth config (NO database imports here!)
// This file is used by middleware.ts which runs in Edge Runtime
export const authConfig: NextAuthConfig = {
    providers: [],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub
                if (token.role) {
                    session.user.role = token.role as UserRole
                }
                if (token.companyId !== undefined && typeof token.companyId === 'string') {
                    session.user.companyId = token.companyId
                }
            }
            return session
        },
        async jwt({ token }) {
            // Edge-compatible: no database calls here
            // Database lookups are done in auth.ts which runs in Node.js runtime
            return token
        },
    },
    session: { strategy: "jwt" },
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
}
