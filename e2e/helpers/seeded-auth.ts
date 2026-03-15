import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { UserRole } from "@prisma/client";
import { encode } from "next-auth/jwt";

import { prisma } from "../../lib/prisma-scripts";

const DEFAULT_E2E_EMAIL = "e2e-admin@spendscope.local";
const DEFAULT_E2E_NAME = "E2E Admin";
const DEFAULT_E2E_MEMBER_EMAIL = "e2e-member@spendscope.local";
const DEFAULT_E2E_MEMBER_NAME = "E2E Member";
const DEFAULT_COMPANY_SLUG = "e2e-spendscope";
const DEFAULT_COMPANY_NAME = "SpendScope E2E";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SeededRole = "admin" | "member";

interface SeededUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly image: string | null;
  readonly role: UserRole;
  readonly companyId: string | null;
}

interface SeededBaseData {
  readonly companyId: string;
  readonly admin: SeededUser;
  readonly member: SeededUser;
}

interface SeededSessionCookie {
  readonly expires: number;
  readonly httpOnly: boolean;
  readonly name: string;
  readonly sameSite: "Lax";
  readonly secure: boolean;
  readonly url: string;
  readonly value: string;
}

function getAppBaseUrl(): URL {
  const configuredBaseUrl =
    process.env.PLAYWRIGHT_BASE_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000";

  return new URL(configuredBaseUrl);
}

function getRequiredNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET is required for Playwright session bootstrapping."
    );
  }

  return secret;
}

function getAuthCookieName(requestUrl: URL): string {
  return requestUrl.protocol === "https:"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

async function ensureBaseData(): Promise<SeededBaseData> {
  const company = await prisma.company.upsert({
    where: { slug: DEFAULT_COMPANY_SLUG },
    update: { name: DEFAULT_COMPANY_NAME },
    create: {
      name: DEFAULT_COMPANY_NAME,
      slug: DEFAULT_COMPANY_SLUG,
    },
  });

  const admin = await prisma.user.upsert({
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
  });

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
  });

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
  });

  const categorySeeds: Array<{ readonly name: string; readonly color: string }> =
    [
      { name: "Food", color: "#ef4444" },
      { name: "Travel", color: "#3b82f6" },
      { name: "Software", color: "#8b5cf6" },
    ];

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
    });
  }

  return { companyId: company.id, admin, member };
}

async function reseedExpenses(
  companyId: string,
  userIds: readonly string[]
): Promise<void> {
  await prisma.expense.deleteMany({
    where: { companyId },
  });

  const categories = await prisma.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const categoryByName: Record<string, string> = {};
  for (const category of categories) {
    categoryByName[category.name] = category.id;
  }

  const requiredCategories = ["Food", "Travel", "Software"];
  const missingCategories = requiredCategories.filter(
    (name) => !categoryByName[name]
  );

  if (missingCategories.length > 0) {
    throw new Error(
      `Missing categories for E2E seed: ${missingCategories.join(", ")}`
    );
  }

  const expensesToCreate: Array<{
    readonly amount: string;
    readonly categoryId: string;
    readonly companyId: string;
    readonly date: Date;
    readonly description: string;
    readonly userId: string;
  }> = [];

  for (let index = 0; index < 60; index += 1) {
    const dayOffset = index % 20;
    const date = new Date(Date.UTC(2026, 0, 31 - dayOffset, 12, 0, 0));
    const amount = (
      50 +
      (index % 10) * 7 +
      Math.floor(index / 10) * 3
    ).toFixed(2);
    const categoryName = requiredCategories[index % requiredCategories.length];

    expensesToCreate.push({
      amount,
      categoryId: categoryByName[categoryName],
      companyId,
      date,
      description: `Seed Expense ${String(index + 1).padStart(2, "0")}`,
      userId: userIds[index % userIds.length],
    });
  }

  await prisma.expense.createMany({
    data: expensesToCreate,
  });
}

async function buildSessionCookie(role: SeededRole): Promise<SeededSessionCookie> {
  const { admin, companyId, member } = await ensureBaseData();
  const sessionUser = role === "member" ? member : admin;

  await reseedExpenses(companyId, [admin.id, member.id]);

  const appBaseUrl = getAppBaseUrl();
  const cookieName = getAuthCookieName(appBaseUrl);
  const token = await encode({
    token: {
      sub: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      picture: sessionUser.image,
      role: sessionUser.role,
      companyId,
    },
    secret: getRequiredNextAuthSecret(),
    maxAge: COOKIE_MAX_AGE_SECONDS,
    salt: cookieName,
  });

  return {
    name: cookieName,
    value: token,
    url: appBaseUrl.origin,
    httpOnly: true,
    sameSite: "Lax",
    secure: appBaseUrl.protocol === "https:",
    expires: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SECONDS,
  };
}

export async function loginWithSeededRole(
  page: Page,
  role: SeededRole
): Promise<void> {
  const cookie = await buildSessionCookie(role);

  await page.context().clearCookies();
  await page.context().addCookies([cookie]);
  await page.goto("/dashboard/expenses");
  await expect(page).toHaveURL(/\/dashboard\/expenses/);
}

export async function logoutSeededSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/dashboard/expenses");
  await expect(page).toHaveURL(/\/login/);
}
