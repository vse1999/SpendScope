import type { Page } from "@playwright/test";

import {
  loginWithSeededRole,
  logoutSeededSession,
} from "./seeded-auth";

export async function loginAsSeededAdmin(page: Page): Promise<void> {
  await loginWithSeededRole(page, "admin");
}

export async function loginAsSeededMember(page: Page): Promise<void> {
  await loginWithSeededRole(page, "member");
}

export async function logoutSeededUser(page: Page): Promise<void> {
  await logoutSeededSession(page);
}
