"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { invalidateCompanyCategoryReadModels } from "@/lib/cache/company-read-model-cache";
import { getNumericLimits } from "@/lib/subscription/config";
import { FeatureGateError, ValidationError } from "@/lib/errors";
import {
  InvitationStatus,
  NotificationType,
  Prisma,
  SubscriptionPlan,
  UserRole,
} from "@prisma/client";

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

interface NormalizedCompanyInput {
  readonly name: string;
  readonly slug: string;
}

type NormalizedCompanyInputResult =
  | { success: true; data: NormalizedCompanyInput }
  | { success: false; error: string };

type CreateCompanyTransactionResult =
  | { status: "ALREADY_IN_COMPANY" }
  | { status: "SUCCESS"; company: { id: string; name: string; slug: string } };

type JoinCompanyTransactionResult =
  | { status: "ALREADY_IN_ANOTHER_COMPANY" }
  | { status: "INVITATION_REQUIRED" }
  | { status: "LIMIT_EXCEEDED"; maxUsersForPlan: number }
  | { status: "NOT_FOUND" }
  | {
      status: "SUCCESS";
      company: { id: string; name: string; slug: string };
      joined: boolean;
    };

const CREATE_COMPANY_MEMBERSHIP_ERROR = "CREATE_COMPANY_MEMBERSHIP_ERROR";
const JOIN_COMPANY_CONFLICT_ERROR = "JOIN_COMPANY_CONFLICT_ERROR";

function normalizeCompanyInput(formData: FormData): NormalizedCompanyInputResult {
  const rawName = formData.get("name");
  const rawSlug = formData.get("slug");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const slug = typeof rawSlug === "string" ? rawSlug.trim().toLowerCase() : "";

  if (!name || !slug) {
    return {
      success: false,
      error: "Company name and slug are required",
    };
  }

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return {
      success: false,
      error: "Slug must contain only lowercase letters, numbers, and hyphens",
    };
  }

  return {
    success: true,
    data: {
      name,
      slug,
    },
  };
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

    const userId = session.user.id;

    const [actionLimit, userLimit] = await Promise.all([
      checkRateLimit("company-action", { tier: "action" }),
      checkRateLimit(`company-user:${userId}`, { tier: "action" }),
    ]);

    if (!actionLimit.allowed || !userLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" };
    }

    const normalizedInput = normalizeCompanyInput(formData);
    if (!normalizedInput.success) {
      return {
        success: false,
        error: normalizedInput.error,
        code: "VALIDATION_ERROR",
      };
    }

    const { name, slug } = normalizedInput.data;

    // Check if slug is already taken
    const existing = await prisma.company.findUnique({
      where: { slug },
    });

    if (existing) {
      return { success: false, error: "Company slug already taken", code: "VALIDATION_ERROR" };
    }

    const result = await prisma.$transaction(
      async (tx): Promise<CreateCompanyTransactionResult> => {
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { companyId: true },
        });

        if (currentUser?.companyId) {
          return { status: "ALREADY_IN_COMPANY" };
        }

        const company = await tx.company.create({
          data: {
            name,
            slug,
          },
        });

        const defaultCategories = [
          { name: "Office Supplies", color: "#3b82f6", icon: "Briefcase" },
          { name: "Travel", color: "#10b981", icon: "Plane" },
          { name: "Meals", color: "#f59e0b", icon: "Utensils" },
          { name: "Software", color: "#8b5cf6", icon: "Monitor" },
          { name: "Equipment", color: "#ef4444", icon: "Wrench" },
        ];

        await tx.category.createMany({
          data: defaultCategories.map((category) => ({
            ...category,
            companyId: company.id,
          })),
        });

        await tx.subscription.create({
          data: {
            companyId: company.id,
            plan: "FREE",
            status: "ACTIVE",
          },
        });

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

        const userUpdate = await tx.user.updateMany({
          where: {
            id: userId,
            companyId: null,
          },
          data: {
            companyId: company.id,
            role: UserRole.ADMIN,
          },
        });

        if (userUpdate.count === 0) {
          throw new ValidationError(
            "companyId",
            userId,
            CREATE_COMPANY_MEMBERSHIP_ERROR
          );
        }

        return {
          status: "SUCCESS",
          company,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    if (result.status === "ALREADY_IN_COMPANY") {
      return {
        success: false,
        error: "Leave your current company before creating a new one",
        code: "VALIDATION_ERROR",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    invalidateCompanyCategoryReadModels(result.company.id);

    return { success: true, company: result.company };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: "Company slug already taken",
        code: "VALIDATION_ERROR",
      };
    }

    if (error instanceof ValidationError && error.message === CREATE_COMPANY_MEMBERSHIP_ERROR) {
      return {
        success: false,
        error: "Leave your current company before creating a new one",
        code: "VALIDATION_ERROR",
      };
    }

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
  let userId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const authenticatedUserId = session.user.id;
    userId = authenticatedUserId;
    const userEmail = session.user.email.toLowerCase();
    const joinerName = session.user.name || session.user.email || "Someone new";

    const [actionLimit, userRateLimit] = await Promise.all([
      checkRateLimit("join-action", { tier: "action" }),
      checkRateLimit(`join-user:${authenticatedUserId}`, { tier: "action" }),
    ]);

    if (!actionLimit.allowed || !userRateLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" };
    }

    const joinResult = await prisma.$transaction(
      async (tx): Promise<JoinCompanyTransactionResult> => {
        const currentUser = await tx.user.findUnique({
          where: { id: authenticatedUserId },
          select: { companyId: true },
        });

        if (currentUser?.companyId && currentUser.companyId !== companyId) {
          return { status: "ALREADY_IN_ANOTHER_COMPANY" };
        }

        const company = await tx.company.findUnique({
          where: { id: companyId },
          include: {
            subscription: true,
            _count: {
              select: { users: true },
            },
          },
        });

        if (!company) {
          return { status: "NOT_FOUND" };
        }

        if (currentUser?.companyId === companyId) {
          return {
            status: "SUCCESS",
            company: {
              id: company.id,
              name: company.name,
              slug: company.slug,
            },
            joined: false,
          };
        }

        const invitation = await tx.invitation.findFirst({
          where: {
            companyId,
            email: userEmail,
            status: InvitationStatus.PENDING,
            expiresAt: { gte: new Date() },
          },
          select: {
            id: true,
            role: true,
          },
        });

        if (!invitation) {
          return { status: "INVITATION_REQUIRED" };
        }

        const plan = company.subscription?.plan ?? SubscriptionPlan.FREE;
        const maxUsersForPlan = getNumericLimits(plan).maxUsers;
        if (company._count.users >= maxUsersForPlan) {
          return {
            status: "LIMIT_EXCEEDED",
            maxUsersForPlan,
          };
        }

        const acceptedAt = new Date();
        const invitationClaim = await tx.invitation.updateMany({
          where: {
            id: invitation.id,
            companyId,
            email: userEmail,
            status: InvitationStatus.PENDING,
            expiresAt: { gte: acceptedAt },
          },
          data: {
            status: InvitationStatus.ACCEPTED,
            acceptedAt,
          },
        });

        if (invitationClaim.count === 0) {
          throw new ValidationError("invitationId", invitation.id, JOIN_COMPANY_CONFLICT_ERROR);
        }

        const membershipClaim = await tx.user.updateMany({
          where: {
            id: authenticatedUserId,
            companyId: null,
          },
          data: {
            companyId,
            role: invitation.role,
          },
        });

        if (membershipClaim.count === 0) {
          throw new ValidationError("companyId", companyId, JOIN_COMPANY_CONFLICT_ERROR);
        }

        return {
          status: "SUCCESS",
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
          },
          joined: true,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    if (joinResult.status === "ALREADY_IN_ANOTHER_COMPANY") {
      return {
        success: false,
        error: "Leave your current company before joining another one",
        code: "ALREADY_IN_ANOTHER_COMPANY",
      };
    }

    if (joinResult.status === "NOT_FOUND") {
      return { success: false, error: "Company not found", code: "NOT_FOUND" };
    }

    if (joinResult.status === "INVITATION_REQUIRED") {
      return {
        success: false,
        error: "A valid invitation is required to join this company",
        code: "INVITATION_REQUIRED",
      };
    }

    if (joinResult.status === "LIMIT_EXCEEDED") {
      return {
        success: false,
        error: `This company has reached the maximum user limit (${formatPlanLimit(joinResult.maxUsersForPlan)}). Upgrade to Pro for unlimited users.`,
        code: "LIMIT_EXCEEDED",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    revalidatePath("/dashboard/team");

    if (joinResult.joined) {
      try {
        const existingMembers = await prisma.user.findMany({
          where: {
            companyId,
            id: { not: authenticatedUserId },
          },
          select: { id: true },
        });

        const notificationRows = [
          ...existingMembers.map((member) => ({
            userId: member.id,
            type: NotificationType.INFO,
            title: "New Team Member",
            message: `${joinerName} joined "${joinResult.company.name}"`,
            actionUrl: "/dashboard/team",
          })),
          {
            userId: authenticatedUserId,
            type: NotificationType.SUCCESS,
            title: "Welcome to the Team!",
            message: `You've successfully joined "${joinResult.company.name}"`,
            actionUrl: "/dashboard",
          },
        ];

        await prisma.notification.createMany({
          data: notificationRows,
        });
      } catch (notifyError) {
        console.error("Failed to send notifications:", notifyError);
      }
    }

    return {
      success: true,
      company: joinResult.company,
    };
  } catch (error) {
    if (error instanceof ValidationError && error.message === JOIN_COMPANY_CONFLICT_ERROR && userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (currentUser?.companyId === companyId) {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: { id: true, name: true, slug: true },
        });

        if (company) {
          return {
            success: true,
            company,
          };
        }
      }

      return {
        success: false,
        error: "Leave your current company before joining another one",
        code: "ALREADY_IN_ANOTHER_COMPANY",
      };
    }

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

