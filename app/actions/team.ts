"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import {
  acceptInvitationByToken,
  cancelPendingInvitation,
  getCurrentUserContext,
  getInvitationPreviewByToken,
  getRecentTeamRoleAudits,
  getTeamMembersForCompany,
  inviteUserToCompany,
  listPendingInvitations,
  resendPendingInvitation,
  updateCompanyMemberRole,
} from "@/lib/invitations/service";
import type { Invitation, InvitationPreview, TeamMember, TeamRoleAuditEntry } from "@/lib/invitations/types";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/app/actions/notifications";

type UnauthorizedCode = "UNAUTHORIZED";

export type GetTeamMembersResult =
  | { success: true; members: TeamMember[]; isAdmin: boolean; currentUserId: string }
  | { success: false; error: string; code?: UnauthorizedCode };

export type InviteTeamMemberResult =
  | { success: true; message: string }
  | {
      success: false;
      error: string;
      code?:
        | "UNAUTHORIZED"
        | "LIMIT_EXCEEDED"
        | "FORBIDDEN_FEATURE"
        | "VALIDATION_ERROR"
        | "ALREADY_MEMBER"
        | "ALREADY_INVITED";
    };

export type RemoveTeamMemberResult =
  | { success: true }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "NOT_FOUND" | "SELF_REMOVE" };

export type UpdateTeamMemberRoleResult =
  | { success: true; message: string }
  | {
      success: false;
      error: string;
      code?:
        | "UNAUTHORIZED"
        | "NOT_FOUND"
        | "SELF_UPDATE"
        | "LAST_ADMIN"
        | "ALREADY_SET"
        | "VALIDATION_ERROR";
    };

type ServiceRoleUpdateErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "SELF_UPDATE"
  | "LAST_ADMIN"
  | "ALREADY_SET"
  | "VALIDATION_ERROR";

type InviteErrorCode =
  | "UNAUTHORIZED"
  | "LIMIT_EXCEEDED"
  | "FORBIDDEN_FEATURE"
  | "VALIDATION_ERROR"
  | "ALREADY_MEMBER"
  | "ALREADY_INVITED";

function toRoleUpdateErrorCode(code: string): ServiceRoleUpdateErrorCode | undefined {
  switch (code) {
    case "UNAUTHORIZED":
    case "NOT_FOUND":
    case "SELF_UPDATE":
    case "LAST_ADMIN":
    case "ALREADY_SET":
    case "VALIDATION_ERROR":
      return code;
    default:
      return undefined;
  }
}

function toInviteErrorCode(code: string): InviteErrorCode | undefined {
  switch (code) {
    case "UNAUTHORIZED":
    case "LIMIT_EXCEEDED":
    case "FORBIDDEN_FEATURE":
    case "VALIDATION_ERROR":
    case "ALREADY_MEMBER":
    case "ALREADY_INVITED":
      return code;
    default:
      return undefined;
  }
}

export type GetPendingInvitationsResult =
  | { success: true; invitations: Invitation[]; isAdmin: boolean }
  | { success: false; error: string; code?: UnauthorizedCode };

export type GetTeamRoleAuditResult =
  | { success: true; audits: TeamRoleAuditEntry[] }
  | { success: false; error: string; code?: UnauthorizedCode };

export type CancelInvitationResult =
  | { success: true }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "NOT_FOUND" };

export type ResendInvitationResult =
  | { success: true; message: string }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION_ERROR" };

export type GetInvitationByTokenResult =
  | { success: true; invitation: InvitationPreview }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "INVALID_TOKEN" | "EXPIRED" | "CANCELLED" | "ACCEPTED" };

export type AcceptInvitationResult =
  | { success: true; companySlug: string }
  | {
      success: false;
      error: string;
      code?:
        | "UNAUTHORIZED"
        | "INVALID_TOKEN"
        | "EXPIRED"
        | "CANCELLED"
        | "ACCEPTED"
        | "LIMIT_EXCEEDED"
        | "ALREADY_IN_ANOTHER_COMPANY";
    };

async function requireCurrentUserContext(): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUserContext>>> }
  | { ok: false; error: string; code: "UNAUTHORIZED" }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  const currentUser = await getCurrentUserContext(session.user.id);
  if (!currentUser) {
    return { ok: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }

  return { ok: true, user: currentUser };
}

export async function getTeamMembers(): Promise<GetTeamMembersResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const currentUser = currentUserResult.user;
    if (!currentUser.companyId) {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }

    const members = await getTeamMembersForCompany(currentUser);
    return {
      success: true,
      members,
      isAdmin: currentUser.role === UserRole.ADMIN,
      currentUserId: currentUser.id,
    };
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch team members",
    };
  }
}

export async function inviteTeamMember(formData: FormData): Promise<InviteTeamMemberResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const emailValue = formData.get("email");
    const roleValue = formData.get("role");

    const email = typeof emailValue === "string" ? emailValue : "";
    const role = roleValue === UserRole.ADMIN ? UserRole.ADMIN : UserRole.MEMBER;

    const result = await inviteUserToCompany(currentUserResult.user, { email, role });
    if (!result.ok) {
      const code = toInviteErrorCode(result.code);
      return { success: false, error: result.error, ...(code ? { code } : {}) };
    }

    revalidatePath("/dashboard/team");
    return { success: true, message: result.message };
  } catch (error) {
    console.error("Failed to invite team member:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite team member",
    };
  }
}

export async function removeTeamMember(userId: string): Promise<RemoveTeamMemberResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const currentUser = currentUserResult.user;
    if (currentUser.role !== UserRole.ADMIN) {
      return { success: false, error: "Only admins can remove team members", code: "UNAUTHORIZED" };
    }

    if (userId === currentUser.id) {
      return { success: false, error: "Cannot remove yourself from the company", code: "SELF_REMOVE" };
    }

    if (!currentUser.companyId) {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }

    const userToRemove = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: currentUser.companyId,
      },
      select: { id: true },
    });

    if (!userToRemove) {
      return { success: false, error: "Team member not found", code: "NOT_FOUND" };
    }

    const company = await prisma.company.findUnique({
      where: { id: currentUser.companyId },
      select: { name: true },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        companyId: null,
        // Prevent role carry-over into a future company.
        role: UserRole.MEMBER,
      },
    });

    revalidatePath("/dashboard/team");

    try {
      await createNotification(userId, {
        type: "WARNING",
        title: "Removed from Company",
        message: `${currentUser.name ?? currentUser.email} removed you from "${company?.name ?? "the company"}"`,
      });
    } catch (notificationError) {
      console.error("Failed to create removal notification:", notificationError);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove team member",
    };
  }
}

export async function updateTeamMemberRole(
  userId: string,
  role: UserRole
): Promise<UpdateTeamMemberRoleResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const result = await updateCompanyMemberRole(currentUserResult.user, userId, role);
    if (!result.ok) {
      return { success: false, error: result.error, code: toRoleUpdateErrorCode(result.code) };
    }

    revalidatePath("/dashboard/team");
    return { success: true, message: result.message };
  } catch (error) {
    console.error("Failed to update team member role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update team member role",
    };
  }
}

export async function getTeamRoleAuditLog(): Promise<GetTeamRoleAuditResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    if (currentUserResult.user.role !== UserRole.ADMIN) {
      return { success: false, error: "Only admins can view role audit logs", code: "UNAUTHORIZED" };
    }

    const audits = await getRecentTeamRoleAudits(currentUserResult.user);
    return { success: true, audits };
  } catch (error) {
    console.error("Failed to fetch team role audit log:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch team role audit log",
    };
  }
}

export async function getPendingInvitations(): Promise<GetPendingInvitationsResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const currentUser = currentUserResult.user;
    if (!currentUser.companyId) {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }

    const invitations = await listPendingInvitations(currentUser);
    return {
      success: true,
      invitations,
      isAdmin: currentUser.role === UserRole.ADMIN,
    };
  } catch (error) {
    console.error("Failed to fetch pending invitations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch pending invitations",
    };
  }
}

export async function cancelInvitation(invitationId: string): Promise<CancelInvitationResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const result = await cancelPendingInvitation(currentUserResult.user, invitationId);
    if (!result.ok) {
      return { success: false, error: result.error };
    }

    revalidatePath("/dashboard/team");
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel invitation",
    };
  }
}

export async function resendInvitation(invitationId: string): Promise<ResendInvitationResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const result = await resendPendingInvitation(currentUserResult.user, invitationId);
    if (!result.ok) {
      return { success: false, error: result.error };
    }

    revalidatePath("/dashboard/team");
    return { success: true, message: result.message };
  } catch (error) {
    console.error("Failed to resend invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resend invitation",
    };
  }
}

export async function getInvitationByToken(token: string): Promise<GetInvitationByTokenResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const result = await getInvitationPreviewByToken(currentUserResult.user, token);
    if (!result.ok) {
      return { success: false, error: result.error };
    }

    return { success: true, invitation: result.invitation };
  } catch (error) {
    console.error("Failed to fetch invitation by token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch invitation",
    };
  }
}

export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
  try {
    const currentUserResult = await requireCurrentUserContext();
    if (!currentUserResult.ok) {
      return { success: false, error: currentUserResult.error, code: currentUserResult.code };
    }

    const result = await acceptInvitationByToken(currentUserResult.user, token);
    if (!result.ok) {
      return { success: false, error: result.error };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/team");
    revalidatePath("/onboarding");

    return { success: true, companySlug: result.companySlug };
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept invitation",
    };
  }
}
