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
            // 2026 Enterprise Security: Force consent screen for re-authentication
            // Used for step-up authentication (account linking)
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            // 2026 Enterprise Security: Force consent screen for account linking
            authorization: {
                params: {
                    prompt: "consent",
                },
            },
        }),
    ],
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    callbacks: {
        // Handle sign-in and account linking
        async signIn({ user, account, profile }) {
            // SECURITY: Email verification check
            // For a $1M enterprise app, we must ensure emails are verified before linking
            
            if (!user.email) {
                console.error(`[SECURITY] Rejected sign-in: no email provided by ${account?.provider}`)
                return '/login?error=OAuthSignin'
            }

            // Provider-specific email verification
            const isEmailVerified = await (async () => {
                if (account?.provider === 'google') {
                    // Google: emails are always verified by Google
                    return (profile as { email_verified?: boolean })?.email_verified === true
                }
                if (account?.provider === 'github') {
                    // GitHub: Auth.js fetches emails from /user/emails endpoint
                    // and only returns verified emails in the user object
                    return true
                }
                return false
            })()

            if (!isEmailVerified) {
                console.error(`[SECURITY] Blocked: unverified email from ${account?.provider} for ${user.email}`)
                return '/login?error=UnverifiedEmail'
            }

            // Log security event for audit trail
            console.log(`[AUTH] Sign-in attempt: ${account?.provider} for ${user.email}`)

            // Check if there's an existing user with this email
            const existingUser = await prisma.user.findUnique({
                where: { email: user.email },
                include: { accounts: true }
            })

            if (!existingUser) {
                // New user - allow sign up
                console.log(`[AUTH] New user registration: ${user.email}`)
                return true
            }

            // Check if this provider account is already linked
            const existingAccount = existingUser.accounts.find(
                a => a.provider === account?.provider && 
                     a.providerAccountId === account.providerAccountId
            )

            if (existingAccount) {
                // Account already linked - allow sign in
                console.log(`[AUTH] Existing user sign-in: ${user.email} via ${account?.provider}`)
                return true
            }

            // User exists but this provider is not linked
            // Auth.js will handle this and show OAuthAccountNotLinked error
            console.log(`[AUTH] Provider not linked: ${account?.provider} for existing user ${user.email}`)
            return true
        },
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
