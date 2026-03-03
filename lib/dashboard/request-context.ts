import { cache } from "react";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
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

function isDynamicServerUsageError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const digest = "digest" in error ? (error as { digest?: unknown }).digest : undefined;
  return digest === "DYNAMIC_SERVER_USAGE";
}

const getCachedDashboardAccessResult = cache(async (): Promise<DashboardAccessResult> => {
  const session = await auth();

  if (!session?.user?.id) {
    return { state: "unauthenticated" };
  }

  try {
    const userRecord = await prisma.user.findUnique({
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
    });

    if (!userRecord?.company) {
      return { state: "missing-company" };
    }

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

    console.error("Failed to resolve dashboard request context:", error);
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
