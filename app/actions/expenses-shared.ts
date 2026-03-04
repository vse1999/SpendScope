import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

type CurrentUserCompanyAccess =
  | { state: "ready"; companyId: string }
  | { state: "unauthenticated" | "without-company" };

/**
 * Helper to get the current user's company ID from database
 * (not from session/JWT to avoid stale data after onboarding)
 */
const getCachedCurrentUserCompanyAccess = cache(async (): Promise<CurrentUserCompanyAccess> => {
  const session = await auth();

  if (!session?.user?.id) {
    return { state: "unauthenticated" };
  }

  // Query database for fresh companyId (not JWT token)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  });

  if (!user?.companyId) {
    return { state: "without-company" };
  }

  return {
    state: "ready",
    companyId: user.companyId,
  };
});

export async function getCurrentUserCompanyAccess(): Promise<CurrentUserCompanyAccess> {
  return getCachedCurrentUserCompanyAccess();
}

export async function getCurrentUserCompanyId(): Promise<string | null> {
  const access = await getCachedCurrentUserCompanyAccess();
  return access.state === "ready" ? access.companyId : null;
}
