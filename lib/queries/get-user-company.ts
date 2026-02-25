"use server";

import { cache } from "react";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function isDynamicServerUsageError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
        return false;
    }

    const digest = "digest" in error ? (error as { digest?: unknown }).digest : undefined;
    return digest === "DYNAMIC_SERVER_USAGE";
}

/**
 * Cached version of getUserCompany for use in Server Components.
 * 
 * React `cache()` deduplicates calls within the same request,
 * so layout.tsx and page.tsx can both call this without hitting the DB twice.
 * 
 * CRITICAL: Always queries database for fresh data, bypassing session cache.
 * This prevents redirect loops after onboarding when JWT token is stale.
 */
export const getCachedUserCompany = cache(async () => {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return { hasCompany: false as const };
        }

        // Always query database for fresh companyId/role - don't rely on session
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { companyId: true, role: true },
        });

        if (!user?.companyId) {
            return { hasCompany: false as const };
        }

        const company = await prisma.company.findUnique({
            where: { id: user.companyId },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });

        if (!company) {
            return { hasCompany: false as const };
        }

        return { hasCompany: true as const, company, userRole: user.role as UserRole };
    } catch (error) {
        if (isDynamicServerUsageError(error)) {
            throw error;
        }

        console.error("Failed to get user company:", error);
        return { hasCompany: false as const };
    }
});
