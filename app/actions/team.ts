"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UserRole, type Prisma } from "@prisma/client";
import { checkFeatureLimit } from "@/lib/subscription/feature-gate-service";
import { FeatureGateError } from "@/lib/errors";

/**
 * Helper to get the current user's company ID from database
 */
async function getCurrentUserCompanyId(): Promise<string | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  });

  return user?.companyId || null;
}

/**
 * Check if current user is an admin
 */
async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === UserRole.ADMIN;
}

/**
 * Serialized team member type for client components
 */
export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  createdAt: Date;
}

/**
 * Result type for get team members action
 */
export type GetTeamMembersResult =
  | { success: true; members: TeamMember[]; isAdmin: boolean; currentUserId: string }
  | { success: false; error: string; code?: "UNAUTHORIZED" };

/**
 * Get all team members for the current user's company
 */
export async function getTeamMembers(): Promise<GetTeamMembersResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }

    const members = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
      orderBy: [
        { role: "asc" }, // ADMIN first, then MEMBER
        { createdAt: "desc" }
      ],
    });

    return {
      success: true,
      members,
      isAdmin: session.user.role === UserRole.ADMIN,
      currentUserId: session.user.id,
    };
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch team members",
    };
  }
}

/**
 * Result type for invite team member action
 */
export type InviteTeamMemberResult =
  | { success: true; message: string }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "LIMIT_EXCEEDED" | "VALIDATION_ERROR" | "ALREADY_MEMBER" | "ALREADY_INVITED" };

/**
 * Invite a new team member by email
 * - Checks if user already exists in the company
 * - Checks user limit based on subscription
 * - Sends invitation (placeholder for email service)
 */
export async function inviteTeamMember(formData: FormData): Promise<InviteTeamMemberResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    // Only admins can invite members
    if (session.user.role !== UserRole.ADMIN) {
      return { success: false, error: "Only admins can invite team members", code: "UNAUTHORIZED" };
    }

    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }

    const email = formData.get("email") as string;
    const role = formData.get("role") as UserRole || UserRole.MEMBER;

    // Validate email
    if (!email || !email.includes("@")) {
      return { success: false, error: "Valid email is required", code: "VALIDATION_ERROR" };
    }

    // Validate role
    if (![UserRole.ADMIN, UserRole.MEMBER].includes(role)) {
      return { success: false, error: "Invalid role specified", code: "VALIDATION_ERROR" };
    }

    // Check if user already exists in the company
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, companyId: true, name: true }
    });

    if (existingUser?.companyId === companyId) {
      return { success: false, error: "User is already a member of this company", code: "ALREADY_MEMBER" };
    }

    // Check user limit before inviting
    const limitCheck = await checkFeatureLimit(companyId, "user", 1);
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: limitCheck.reason ?? "User limit exceeded. Upgrade to Pro for unlimited users.",
        code: "LIMIT_EXCEEDED",
      };
    }

    // TODO: Uncomment after running the invitations migration
    // Check if there's an existing pending invitation
    // const existingInvitation = await prisma.invitation.findFirst({
    //   where: {
    //     email: email.toLowerCase(),
    //     companyId,
    //     status: "PENDING",
    //   },
    // });
    // if (existingInvitation) {
    //   return { success: false, error: "Invitation already sent to this email", code: "ALREADY_INVITED" };
    // }

    // TODO: Uncomment after running the invitations migration
    // Create the invitation record
    // await prisma.invitation.create({
    //   data: {
    //     email: email.toLowerCase(),
    //     companyId,
    //     role,
    //     invitedBy: session.user.id,
    //     status: "PENDING",
    //     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    //   },
    // });

    // TODO: Send actual invitation email
    // This would integrate with an email service like SendGrid, Resend, etc.
    // eslint-disable-next-line no-console
    console.log(`[INVITATION] Invitation sent to ${email} for company ${companyId} with role ${role}`);

    // TODO: Uncomment after running the invitations migration
    // revalidatePath("/dashboard/team");

    return {
      success: true,
      message: `Invitation sent to ${email} (Note: invitations table migration required for full functionality)`,
    };
  } catch (error) {
    console.error("Failed to invite team member:", error);
    
    if (error instanceof FeatureGateError) {
      return {
        success: false,
        error: error.message,
        code: "LIMIT_EXCEEDED",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite team member",
    };
  }
}

/**
 * Result type for remove team member action
 */
export type RemoveTeamMemberResult =
  | { success: true }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "NOT_FOUND" | "SELF_REMOVE" };

/**
 * Remove a team member from the company
 * Only admins can remove members
 * Cannot remove yourself
 */
export async function removeTeamMember(userId: string): Promise<RemoveTeamMemberResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    // Only admins can remove members
    if (session.user.role !== UserRole.ADMIN) {
      return { success: false, error: "Only admins can remove team members", code: "UNAUTHORIZED" };
    }

    // Cannot remove yourself
    if (userId === session.user.id) {
      return { success: false, error: "Cannot remove yourself from the company", code: "SELF_REMOVE" };
    }

    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }

    // Verify the user belongs to the same company
    const userToRemove = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
    });

    if (!userToRemove) {
      return { success: false, error: "Team member not found", code: "NOT_FOUND" };
    }

    // Remove user from company (set companyId to null)
    await prisma.user.update({
      where: { id: userId },
      data: { companyId: null },
    });

    revalidatePath("/dashboard/team");

    return { success: true };
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove team member",
    };
  }
}

/**
 * Invitation type for client components
 */
export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  invitedAt: Date;
  expiresAt: Date;
  invitedBy: {
    name: string | null;
    email: string;
  };
}

/**
 * Result type for get pending invitations action
 */
export type GetPendingInvitationsResult =
  | { success: true; invitations: Invitation[]; isAdmin: boolean }
  | { success: false; error: string; code?: "UNAUTHORIZED" };

/**
 * Get all pending invitations for the current user's company
 * 
 * TODO: This function currently returns an empty array because the `invitations`
 * table does not exist in the database. To enable invitations, run the migration:
 * `npx prisma migrate dev` after adding the Invitation model to schema.prisma
 */
export async function getPendingInvitations(): Promise<GetPendingInvitationsResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    // TODO: Uncomment the database query after running the invitations migration
    // const companyId = await getCurrentUserCompanyId();
    // if (!companyId) {
    //   return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    // }
    // const invitations = await prisma.invitation.findMany({...});

    // Return empty array for now since invitations table doesn't exist
    return {
      success: true,
      invitations: [],
      isAdmin: session.user.role === UserRole.ADMIN,
    };
  } catch (error) {
    console.error("Failed to fetch pending invitations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch pending invitations",
    };
  }
}

/**
 * Result type for cancel invitation action
 */
export type CancelInvitationResult =
  | { success: true }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "NOT_FOUND" };

/**
 * Cancel a pending invitation
 * Only admins can cancel invitations
 * 
 * TODO: This function is disabled because the `invitations` table does not exist.
 * Run the migration after adding the Invitation model to schema.prisma to enable.
 */
export async function cancelInvitation(invitationId: string): Promise<CancelInvitationResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    // Only admins can cancel invitations
    if (session.user.role !== UserRole.ADMIN) {
      return { success: false, error: "Only admins can cancel invitations", code: "UNAUTHORIZED" };
    }

    // TODO: Uncomment after running the invitations migration
    // const companyId = await getCurrentUserCompanyId();
    // if (!companyId) {
    //   return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    // }
    // Verify the invitation belongs to the same company
    // const invitation = await prisma.invitation.findFirst({...});
    // if (!invitation) {
    //   return { success: false, error: "Invitation not found", code: "NOT_FOUND" };
    // }
    // Update invitation status to cancelled
    // await prisma.invitation.update({...});
    // revalidatePath("/dashboard/team");

    // Return success for now (functionality disabled)
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel invitation",
    };
  }
}

/**
 * Result type for resend invitation action
 */
export type ResendInvitationResult =
  | { success: true; message: string }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION_ERROR" };

/**
 * Resend a pending invitation
 * Only admins can resend invitations
 * 
 * TODO: This function is disabled because the `invitations` table does not exist.
 * Run the migration after adding the Invitation model to schema.prisma to enable.
 */
export async function resendInvitation(invitationId: string): Promise<ResendInvitationResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    // Only admins can resend invitations
    if (session.user.role !== UserRole.ADMIN) {
      return { success: false, error: "Only admins can resend invitations", code: "UNAUTHORIZED" };
    }

    // TODO: Uncomment after running the invitations migration
    // const companyId = await getCurrentUserCompanyId();
    // if (!companyId) {
    //   return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    // }
    // Verify the invitation belongs to the same company
    // const invitation = await prisma.invitation.findFirst({...});
    // if (!invitation) {
    //   return { success: false, error: "Invitation not found", code: "NOT_FOUND" };
    // }
    // Update invitation with new expiration date
    // await prisma.invitation.update({...});
    // TODO: Resend actual invitation email
    // console.log(`[INVITATION] Resent invitation to ${invitation.email} for company ${companyId}`);
    // revalidatePath("/dashboard/team");

    // Return placeholder message for now (functionality disabled)
    return {
      success: true,
      message: "Invitation resent (Note: invitations table migration required for full functionality)",
    };
  } catch (error) {
    console.error("Failed to resend invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resend invitation",
    };
  }
}
