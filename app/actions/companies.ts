"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { invalidateCompanyCategoryReadModels } from "@/lib/cache/company-read-model-cache";
import { checkFeatureLimit } from "@/lib/subscription/feature-gate-service";
import { getNumericLimits } from "@/lib/subscription/config";
import { FeatureGateError } from "@/lib/errors";
import { InvitationStatus, SubscriptionPlan, UserRole } from "@prisma/client";
import { createNotification } from "@/app/actions/notifications";

/**
 * Get all companies the user can join.
 * Invitation-only onboarding: only pending invitations for the current email are listed.
 */
export async function getAllCompanies() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return { error: "Not authenticated" };
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        email: session.user.email.toLowerCase(),
        status: InvitationStatus.PENDING,
        expiresAt: { gte: new Date() },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            _count: {
              select: {
                users: true,
              },
            },
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    return invitations.map((invitation) => invitation.company);
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch companies",
    };
  }
}

/**
 * Result type for create company action
 */
type CreateCompanyResult =
  | { success: true; company: { id: string; name: string; slug: string } }
  | { success: false; error: string; code?: "VALIDATION_ERROR" | "UNAUTHORIZED" | "RATE_LIMITED" };

/**
 * Result type for join company action
 */
type JoinCompanyResult =
  | { success: true; company: { id: string; name: string; slug: string } }
  | {
      success: false;
      error: string;
      code?:
        | "LIMIT_EXCEEDED"
        | "NOT_FOUND"
        | "UNAUTHORIZED"
        | "RATE_LIMITED"
        | "INVITATION_REQUIRED"
        | "ALREADY_IN_ANOTHER_COMPANY";
    };

function formatPlanLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "unlimited";
}

/**
 * Create a new company and assign the current user as admin
 * Includes CompanyUsage record creation with default limits
 */
export async function createCompany(formData: FormData): Promise<CreateCompanyResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const [actionLimit, userLimit] = await Promise.all([
      checkRateLimit("company-action", { tier: "action" }),
      checkRateLimit(`company-user:${session.user.id}`, { tier: "action" }),
    ]);

    if (!actionLimit.allowed || !userLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" };
    }

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    if (!name || !slug) {
      return { success: false, error: "Company name and slug are required", code: "VALIDATION_ERROR" };
    }

    // Validate slug format (alphanumeric, hyphens)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug.toLowerCase())) {
      return { success: false, error: "Slug must contain only lowercase letters, numbers, and hyphens", code: "VALIDATION_ERROR" };
    }

    // Check if slug is already taken
    const existing = await prisma.company.findUnique({
      where: { slug: slug.toLowerCase() },
    });

    if (existing) {
      return { success: false, error: "Company slug already taken", code: "VALIDATION_ERROR" };
    }

    // Create company and update user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the company
      const company = await tx.company.create({
        data: {
          name: name.trim(),
          slug: slug.toLowerCase(),
        },
      });

      // Create default categories for the company
      const defaultCategories = [
        { name: "Office Supplies", color: "#3b82f6", icon: "Briefcase" },
        { name: "Travel", color: "#10b981", icon: "Plane" },
        { name: "Meals", color: "#f59e0b", icon: "Utensils" },
        { name: "Software", color: "#8b5cf6", icon: "Monitor" },
        { name: "Equipment", color: "#ef4444", icon: "Wrench" },
      ];

      await tx.category.createMany({
        data: defaultCategories.map((cat) => ({
          ...cat,
          companyId: company.id,
        })),
      });

      // Create free subscription for the company
      await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: "FREE",
          status: "ACTIVE",
        },
      });

      // Create CompanyUsage record with default limits
      const now = new Date();
      const currentMonth = now.getFullYear() * 100 + (now.getMonth() + 1);
      const freePlanLimits = getNumericLimits(SubscriptionPlan.FREE);

      await tx.companyUsage.create({
        data: {
          companyId: company.id,
          currentMonth,
          monthlyExpenses: 0,
          maxExpenses: freePlanLimits.maxMonthlyExpenses,
          maxUsers: freePlanLimits.maxUsers,
          maxCategories: freePlanLimits.maxCategories,
          version: 0,
        },
      });

      // Update user to be admin of the new company
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          companyId: company.id,
          role: UserRole.ADMIN,
        },
      });

      return company;
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    invalidateCompanyCategoryReadModels(result.id);

    return { success: true, company: result };
  } catch (error) {
    console.error("Failed to create company:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create company",
    };
  }
}

/**
 * Join an existing company with invitation and user limit enforcement
 */
export async function joinCompany(companyId: string): Promise<JoinCompanyResult> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const [actionLimit, userRateLimit] = await Promise.all([
      checkRateLimit("join-action", { tier: "action" }),
      checkRateLimit(`join-user:${session.user.id}`, { tier: "action" }),
    ]);

    if (!actionLimit.allowed || !userRateLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (currentUser?.companyId && currentUser.companyId !== companyId) {
      return {
        success: false,
        error: "Leave your current company before joining another one",
        code: "ALREADY_IN_ANOTHER_COMPANY",
      };
    }

    if (currentUser?.companyId === companyId) {
      const existingCompany = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, slug: true },
      });

      if (!existingCompany) {
        return { success: false, error: "Company not found", code: "NOT_FOUND" };
      }

      return { success: true, company: existingCompany };
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        subscription: true,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!company) {
      return { success: false, error: "Company not found", code: "NOT_FOUND" };
    }

    // Invitation check is mandatory for joining
    const invitation = await prisma.invitation.findFirst({
      where: {
        companyId,
        email: session.user.email.toLowerCase(),
        status: InvitationStatus.PENDING,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!invitation) {
      return {
        success: false,
        error: "A valid invitation is required to join this company",
        code: "INVITATION_REQUIRED",
      };
    }

    // Check user limit before allowing join
    const plan = company.subscription?.plan ?? SubscriptionPlan.FREE;
    const maxUsersForPlan = getNumericLimits(plan).maxUsers;

    if (company._count.users >= maxUsersForPlan) {
      return {
        success: false,
        error: `This company has reached the maximum user limit (${formatPlanLimit(maxUsersForPlan)}). Upgrade to Pro for unlimited users.`,
        code: "LIMIT_EXCEEDED",
      };
    }

    // Additional feature gate check (graceful)
    try {
      const limitCheck = await checkFeatureLimit(companyId, "user", 1);
      if (!limitCheck.allowed) {
        return {
          success: false,
          error: limitCheck.reason ?? "User limit exceeded for this company",
          code: "LIMIT_EXCEEDED",
        };
      }
    } catch (error) {
      // Gracefully handle limit check failure - use the simpler check above
      console.error("Feature limit check failed:", error);
    }

    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: session.user!.id! },
        data: {
          companyId,
          // Never carry roles across tenants.
          role: invitation.role,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    // Notify existing company members about the new joiner
    try {
      const existingMembers = await prisma.user.findMany({
        where: { companyId },
        select: { id: true },
      });

      const joinerName = session.user.name || session.user.email || "Someone new";

      for (const member of existingMembers) {
        if (member.id !== session.user.id) {
          await createNotification(member.id, {
            type: "INFO",
            title: "New Team Member",
            message: `${joinerName} joined "${company.name}"`,
            actionUrl: "/dashboard/team",
          });
        }
      }

      await createNotification(session.user.id, {
        type: "SUCCESS",
        title: "Welcome to the Team!",
        message: `You've successfully joined "${company.name}"`,
        actionUrl: "/dashboard",
      });
    } catch (notifyError) {
      console.error("Failed to send notifications:", notifyError);
    }

    return {
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
    };
  } catch (error) {
    console.error("Failed to join company:", error);

    if (error instanceof FeatureGateError) {
      return {
        success: false,
        error: error.message,
        code: "LIMIT_EXCEEDED",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to join company",
    };
  }
}

/**
 * Check if user has a company
 *
 * CRITICAL: Always queries database for fresh data, bypassing session cache.
 * This prevents redirect loops after onboarding when JWT token is stale.
 */
export async function getUserCompany() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    // Always query database for fresh companyId - don't rely on session
    // This handles stale JWT tokens after company creation/joining
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return { hasCompany: false };
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
      return { hasCompany: false };
    }

    return { hasCompany: true, company };
  } catch (error) {
    console.error("Failed to get user company:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to get company info",
    };
  }
}

