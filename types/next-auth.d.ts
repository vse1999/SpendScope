import { DefaultSession } from "next-auth"

// Define role type locally for Edge compatibility
// Must match Prisma schema: enum UserRole { ADMIN MEMBER }
type UserRole = "ADMIN" | "MEMBER"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      companyId?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role?: UserRole
    companyId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    companyId?: string | null
  }
}
