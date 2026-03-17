import { cache } from "react";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { createLogger } from "@/lib/monitoring/logger";
import { prisma } from "@/lib/prisma";

type DashboardAccessState = "missing-company" | "ready" | "unauthenticated";

interface DashboardAccessResultReady {
  context: DashboardRequestContext;
  state: "ready";
}

interface DashboardAccessResultUnavailable {
  state: Exclude<DashboardAccessState, "ready">;
}

type DashboardAccessResult = DashboardAccessResultReady | DashboardAccessResultUnavailable;

export interface DashboardRequestContext {
  user: {
    company: {
      id: string;
      name: string;
    };
    email?: string | null;
    id: string;
    image?: string | null;
    name?: string | null;
    role: UserRole;
  };
}

const logger = createLogger("dashboard-request-context")

async function measureDashboardRequestContextStage<T>(
  stageName: string,
  details: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now()

  try {
    const result = await fn()

    logger.info("dashboard_request_context_stage", {
      ...details,
      durationMs: Date.now() - startedAt,
      stageName,
    })

    return result
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      throw error
    }

    logger.error("dashboard_request_context_stage_failed", {
      ...details,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
      stageName,
    })

    throw error
  }
}

function isDynamicServerUsageError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const digest = "digest" in error ? (error as { digest?: unknown }).digest : undefined;
  return digest === "DYNAMIC_SERVER_USAGE";
}

const getCachedDashboardAccessResult = cache(async (): Promise<DashboardAccessResult> => {
  const startedAt = Date.now()
  const session = await measureDashboardRequestContextStage("auth_read", {}, async () => auth())

  if (!session?.user?.id) {
    logger.info("dashboard_request_context_resolved", {
      durationMs: Date.now() - startedAt,
      state: "unauthenticated",
    })
    return { state: "unauthenticated" };
  }

  try {
    const userRecord = await measureDashboardRequestContextStage(
      "dashboard_context_db_lookup",
      { userId: session.user.id },
      async () =>
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            role: true,
          },
        })
    )

    if (!userRecord?.company) {
      logger.info("dashboard_request_context_resolved", {
        durationMs: Date.now() - startedAt,
        state: "missing-company",
        userId: session.user.id,
      })
      return { state: "missing-company" };
    }

    logger.info("dashboard_request_context_resolved", {
      companyId: userRecord.company.id,
      durationMs: Date.now() - startedAt,
      state: "ready",
      userId: session.user.id,
    })

    return {
      context: {
        user: {
          company: userRecord.company,
          email: session.user.email,
          id: session.user.id,
          image: session.user.image,
          name: session.user.name,
          role: userRecord.role,
        },
      },
      state: "ready",
    };
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      throw error;
    }

    logger.error("dashboard_request_context_failed", {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
      userId: session.user.id,
    })
    return { state: "missing-company" };
  }
});

export async function requireDashboardRequestContext(): Promise<DashboardRequestContext> {
  const result = await getCachedDashboardAccessResult();

  if (result.state !== "ready") {
    if (result.state === "unauthenticated") {
      redirect("/login");
    }

    redirect("/onboarding");
  }

  return result.context;
}
