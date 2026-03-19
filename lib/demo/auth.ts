import { prisma } from "@/lib/prisma"

import { DEMO_GUEST_EMAIL, DEMO_LOGIN_PROVIDER_ID, isDemoEnabled, isDemoGuestEmail } from "./config"

export interface DemoGuestUserRecord {
  readonly id: string
  readonly email: string
  readonly name: string | null
  readonly companyId: string | null
}

function readCredentialEmail(
  credentials: Partial<Record<"email", unknown>> | undefined
): string | null {
  const email = credentials?.email

  if (typeof email !== "string") {
    return null
  }

  const normalizedEmail = email.trim().toLowerCase()
  return normalizedEmail.length > 0 ? normalizedEmail : null
}

export function isDemoProvider(provider: string | undefined): boolean {
  return provider === DEMO_LOGIN_PROVIDER_ID
}

export async function findDemoGuestUser(): Promise<DemoGuestUserRecord | null> {
  return prisma.user.findUnique({
    where: { email: DEMO_GUEST_EMAIL },
    select: {
      id: true,
      email: true,
      name: true,
      companyId: true,
    },
  })
}

export async function authorizeDemoCredentials(
  credentials: Partial<Record<"email", unknown>> | undefined
): Promise<{ readonly id: string; readonly email: string; readonly name: string | null } | null> {
  if (!isDemoEnabled()) {
    return null
  }

  const email = readCredentialEmail(credentials)
  if (!email || !isDemoGuestEmail(email)) {
    return null
  }

  const demoUser = await findDemoGuestUser()
  if (!demoUser?.companyId) {
    return null
  }

  return {
    id: demoUser.id,
    email: demoUser.email,
    name: demoUser.name,
  }
}
