import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/**
 * Helper to get the current user's company ID from database
 * (not from session/JWT to avoid stale data after onboarding)
 */
export async function getCurrentUserCompanyId(): Promise<string | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Query database for fresh companyId (not JWT token)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  });

  return user?.companyId || null;
}

