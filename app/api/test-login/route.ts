import { NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { areTestEndpointsEnabled } from "@/lib/runtime/test-endpoints"

const DEFAULT_E2E_EMAIL = "e2e-admin@spendscope.local"
const DEFAULT_E2E_NAME = "E2E Admin"
const DEFAULT_E2E_MEMBER_EMAIL = "e2e-member@spendscope.local"
const DEFAULT_E2E_MEMBER_NAME = "E2E Member"
const DEFAULT_COMPANY_SLUG = "e2e-spendscope"
const DEFAULT_COMPANY_NAME = "SpendScope E2E"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function ensureBypassEnabled(): void {
  if (!areTestEndpointsEnabled()) {
    throw new Error("test-login is disabled; set ENABLE_TEST_ENDPOINTS=true in non-production environments")
  }

  if (process.env.E2E_LOGIN_BYPASS !== "true") {
    throw new Error("Set E2E_LOGIN_BYPASS=true to use test-login")
  }

  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is required for test-login")
  }
}

function validateToken(url: URL): void {
  const configuredToken = process.env.E2E_LOGIN_TOKEN
  if (!configuredToken) {
    return
  }

  const tokenFromQuery = url.searchParams.get("token")
  if (tokenFromQuery !== configuredToken) {
    throw new Error("Invalid token")
  }
}

function getAuthCookieName(requestUrl: URL): string {
  return requestUrl.protocol === "https:"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
}

async function ensureBaseData(): Promise<{
  user: { id: string; email: string; name: string | null; image: string | null; role: UserRole; companyId: string | null }
  member: { id: string; email: string; name: string | null; image: string | null; role: UserRole; companyId: string | null }
  companyId: string
}> {
  const company = await prisma.company.upsert({
    where: { slug: DEFAULT_COMPANY_SLUG },
    update: { name: DEFAULT_COMPANY_NAME },
    create: {
      name: DEFAULT_COMPANY_NAME,
      slug: DEFAULT_COMPANY_SLUG,
    },
  })

  const user = await prisma.user.upsert({
    where: { email: DEFAULT_E2E_EMAIL },
    update: {
      name: DEFAULT_E2E_NAME,
      role: UserRole.ADMIN,
      companyId: company.id,
      emailVerified: new Date(),
    },
    create: {
      email: DEFAULT_E2E_EMAIL,
      name: DEFAULT_E2E_NAME,
      role: UserRole.ADMIN,
      companyId: company.id,
      emailVerified: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      companyId: true,
    },
  })

  const member = await prisma.user.upsert({
    where: { email: DEFAULT_E2E_MEMBER_EMAIL },
    update: {
      name: DEFAULT_E2E_MEMBER_NAME,
      role: UserRole.MEMBER,
      companyId: company.id,
      emailVerified: new Date(),
    },
    create: {
      email: DEFAULT_E2E_MEMBER_EMAIL,
      name: DEFAULT_E2E_MEMBER_NAME,
      role: UserRole.MEMBER,
      companyId: company.id,
      emailVerified: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      companyId: true,
    },
  })

  // Keep e2e paths deterministic: test company always has Pro features enabled.
  await prisma.subscription.upsert({
    where: { companyId: company.id },
    update: {
      plan: "PRO",
      status: "ACTIVE",
    },
    create: {
      companyId: company.id,
      plan: "PRO",
      status: "ACTIVE",
    },
  })

  const categorySeeds: Array<{ name: string; color: string }> = [
    { name: "Food", color: "#ef4444" },
    { name: "Travel", color: "#3b82f6" },
    { name: "Software", color: "#8b5cf6" },
  ]

  for (const category of categorySeeds) {
    await prisma.category.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: category.name,
        },
      },
      update: { color: category.color },
      create: {
        companyId: company.id,
        name: category.name,
        color: category.color,
      },
    })
  }

  return { user, member, companyId: company.id }
}

async function reseedExpenses(companyId: string, userIds: string[]): Promise<void> {
  await prisma.expense.deleteMany({
    where: { companyId },
  })

  const categories = await prisma.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const categoryByName: Record<string, string> = {}
  for (const category of categories) {
    categoryByName[category.name] = category.id
  }

  const requiredCategories = ["Food", "Travel", "Software"]
  const missing = requiredCategories.filter((name) => !categoryByName[name])
  if (missing.length > 0) {
    throw new Error(`Missing categories for seed: ${missing.join(", ")}`)
  }

  const expensesToCreate: Array<{
    amount: string
    description: string
    date: Date
    categoryId: string
    userId: string
    companyId: string
  }> = []

  for (let index = 0; index < 60; index += 1) {
    const dayOffset = index % 20
    const date = new Date(Date.UTC(2026, 0, 31 - dayOffset, 12, 0, 0))
    const amount = (50 + (index % 10) * 7 + Math.floor(index / 10) * 3).toFixed(2)

    const categoryName = requiredCategories[index % requiredCategories.length]
    expensesToCreate.push({
      amount,
      description: `Seed Expense ${String(index + 1).padStart(2, "0")}`,
      date,
      categoryId: categoryByName[categoryName],
        userId: userIds[index % userIds.length],
        companyId,
      })
  }

  await prisma.expense.createMany({
    data: expensesToCreate,
  })
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    ensureBypassEnabled()
    const url = new URL(request.url)
    validateToken(url)
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    if (!nextAuthSecret) {
      throw new Error("NEXTAUTH_SECRET is required for test-login")
    }

    const { user, member, companyId } = await ensureBaseData()
    const shouldSeed = url.searchParams.get("seed") === "1"

    if (shouldSeed) {
      await reseedExpenses(companyId, [user.id, member.id])
    }

    const cookieName = getAuthCookieName(url)
    const token = await encode({
      token: {
        sub: user.id,
        name: user.name,
        email: user.email,
        picture: user.image,
        role: user.role,
        companyId,
      },
      secret: nextAuthSecret,
      maxAge: COOKIE_MAX_AGE_SECONDS,
      salt: cookieName,
    })

    const response = NextResponse.redirect(new URL("/dashboard/expenses", request.url))
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: url.protocol === "https:",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    })
    return response
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create test session",
      },
      { status: 401 }
    )
  }
}
