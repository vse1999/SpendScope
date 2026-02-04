import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { UserRole } from "@prisma/client"

// Full auth configuration for Node.js runtime (API routes)
export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
    ],
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    callbacks: {
        // Override the jwt callback to add database lookups
        async jwt({ token, user, trigger }) {
            // On sign-in, fetch full user from database to get custom fields
            if (user?.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { role: true, companyId: true }
                })
                
                if (dbUser) {
                    token.role = dbUser.role
                    token.companyId = dbUser.companyId
                }
            }
            
            // Allow session update to refresh token data
            if (trigger === "update" && token.sub) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.sub },
                    select: { role: true, companyId: true }
                })
                
                if (dbUser) {
                    token.role = dbUser.role
                    token.companyId = dbUser.companyId
                }
            }
            
            return token
        },
        // Override the session callback (same logic as in auth.config.ts)
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
    },
})
