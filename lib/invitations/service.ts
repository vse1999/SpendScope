import { InvitationStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkFeatureLimit } from "@/lib/subscription/feature-gate-service";
import { FeatureGateError } from "@/lib/errors";
import { createNotification } from "@/app/actions/notifications";
import { sendTeamInvitationEmail } from "@/lib/email/invitations";
import type {
  CurrentUserContext,
  Invitation,
  InvitationPreview,
  InviteTeamMemberInput,
  TeamMember,
} from "@/lib/invitations/types";

const INVITATION_EXPIRY_DAYS = 7;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getAppBaseUrl(): string {
  const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error("APP_URL or NEXTAUTH_URL must be configured");
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function getInvitationAcceptUrl(token: string): string {
  return `${getAppBaseUrl()}/invite/accept?token=${encodeURIComponent(token)}`;
}

function getInvitationExpiryDate(): Date {
  return new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

async function expireOverdueInvitations(companyId: string): Promise<void> {
  await prisma.invitation.updateMany({
    where: {
      companyId,
      status: InvitationStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: {
      status: InvitationStatus.EXPIRED,
    },
  });
}

function getDisplayName(user: { name: string | null; email: string }): string {
  return user.name?.trim() ? user.name : user.email;
}

export async function getCurrentUserContext(userId: string): Promise<CurrentUserContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      companyId: true,
      name: true,
      email: true,
    },
  });

  if (!user?.email) {
    return null;
  }

  return user;
}

export async function getTeamMembersForCompany(currentUser: CurrentUserContext): Promise<TeamMember[]> {
  if (!currentUser.companyId) {
    return [];
  }

  return prisma.user.findMany({
    where: { companyId: currentUser.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "desc" },
    ],
  });
}

export async function inviteUserToCompany(
  currentUser: CurrentUserContext,
  input: InviteTeamMemberInput
): Promise<{ ok: true; message: string } | { ok: false; code: string; error: string }> {
  if (!currentUser.companyId) {
    return { ok: false, code: "UNAUTHORIZED", error: "User is not assigned to a company" };
  }

  if (currentUser.role !== UserRole.ADMIN) {
    return { ok: false, code: "UNAUTHORIZED", error: "Only admins can invite team members" };
  }

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, code: "VALIDATION_ERROR", error: "Valid email is required" };
  }

  if (input.role !== UserRole.ADMIN && input.role !== UserRole.MEMBER) {
    return { ok: false, code: "VALIDATION_ERROR", error: "Invalid role specified" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { companyId: true },
  });

  if (existingUser?.companyId === currentUser.companyId) {
    return { ok: false, code: "ALREADY_MEMBER", error: "User is already a member of this company" };
  }

  try {
    const limitCheck = await checkFeatureLimit(currentUser.companyId, "user", 1);
    if (!limitCheck.allowed) {
      return {
        ok: false,
        code: "LIMIT_EXCEEDED",
        error: limitCheck.reason ?? "User limit exceeded. Upgrade to Pro for unlimited users.",
      };
    }
  } catch (error) {
    if (error instanceof FeatureGateError) {
      return { ok: false, code: "LIMIT_EXCEEDED", error: error.message };
    }
    throw error;
  }

  await expireOverdueInvitations(currentUser.companyId);

  const pendingInvitation = await prisma.invitation.findFirst({
    where: {
      companyId: currentUser.companyId,
      email,
      status: InvitationStatus.PENDING,
    },
    select: { expiresAt: true },
  });

  if (pendingInvitation) {
    return {
      ok: false,
      code: "ALREADY_INVITED",
      error: `Invitation already sent. Expires on ${pendingInvitation.expiresAt.toLocaleString()}`,
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: currentUser.companyId },
    select: { name: true },
  });

  if (!company) {
    return { ok: false, code: "VALIDATION_ERROR", error: "Company not found" };
  }

  const expiresAt = getInvitationExpiryDate();

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role: input.role,
      status: InvitationStatus.PENDING,
      companyId: currentUser.companyId,
      invitedBy: currentUser.id,
      expiresAt,
    },
    select: { id: true },
  });

  try {
    await sendTeamInvitationEmail({
      to: email,
      inviterName: getDisplayName(currentUser),
      companyName: company.name,
      role: input.role,
      acceptUrl: getInvitationAcceptUrl(invitation.id),
      expiresAt,
    });
  } catch (emailError) {
    await prisma.invitation.delete({ where: { id: invitation.id } });
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error:
        emailError instanceof Error
          ? `Failed to send invitation email: ${emailError.message}`
          : "Failed to send invitation email",
    };
  }

  return { ok: true, message: `Invitation sent to ${email}` };
}

export async function listPendingInvitations(currentUser: CurrentUserContext): Promise<Invitation[]> {
  if (!currentUser.companyId) {
    return [];
  }

  await expireOverdueInvitations(currentUser.companyId);

  const invitations = await prisma.invitation.findMany({
    where: {
      companyId: currentUser.companyId,
      status: InvitationStatus.PENDING,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      invitedAt: true,
      expiresAt: true,
      invitedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { invitedAt: "desc" },
  });

  return invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    invitedAt: invitation.invitedAt,
    expiresAt: invitation.expiresAt,
    invitedBy: invitation.invitedByUser,
  }));
}

export async function cancelPendingInvitation(
  currentUser: CurrentUserContext,
  invitationId: string
): Promise<{ ok: true } | { ok: false; code: string; error: string }> {
  if (!currentUser.companyId || currentUser.role !== UserRole.ADMIN) {
    return { ok: false, code: "UNAUTHORIZED", error: "Only admins can cancel invitations" };
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      companyId: currentUser.companyId,
      status: InvitationStatus.PENDING,
    },
    select: { id: true },
  });

  if (!invitation) {
    return { ok: false, code: "NOT_FOUND", error: "Invitation not found" };
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: InvitationStatus.CANCELLED },
  });

  return { ok: true };
}

export async function resendPendingInvitation(
  currentUser: CurrentUserContext,
  invitationId: string
): Promise<{ ok: true; message: string } | { ok: false; code: string; error: string }> {
  if (!currentUser.companyId || currentUser.role !== UserRole.ADMIN) {
    return { ok: false, code: "UNAUTHORIZED", error: "Only admins can resend invitations" };
  }

  await expireOverdueInvitations(currentUser.companyId);

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      companyId: currentUser.companyId,
      status: InvitationStatus.PENDING,
    },
    include: {
      company: { select: { name: true } },
    },
  });

  if (!invitation) {
    return { ok: false, code: "NOT_FOUND", error: "Invitation not found" };
  }

  const expiresAt = getInvitationExpiryDate();

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      invitedAt: new Date(),
      expiresAt,
    },
  });

  await sendTeamInvitationEmail({
    to: invitation.email,
    inviterName: getDisplayName(currentUser),
    companyName: invitation.company.name,
    role: invitation.role,
    acceptUrl: getInvitationAcceptUrl(invitation.id),
    expiresAt,
  });

  return { ok: true, message: `Invitation resent to ${invitation.email}` };
}

export async function getInvitationPreviewByToken(
  currentUser: CurrentUserContext,
  rawToken: string
): Promise<{ ok: true; invitation: InvitationPreview } | { ok: false; code: string; error: string }> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, code: "INVALID_TOKEN", error: "Missing invitation token" };
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: token },
    include: {
      company: {
        select: { name: true, slug: true },
      },
      invitedByUser: {
        select: { name: true, email: true },
      },
    },
  });

  if (!invitation) {
    return { ok: false, code: "INVALID_TOKEN", error: "Invitation not found" };
  }

  if (normalizeEmail(invitation.email) !== normalizeEmail(currentUser.email)) {
    return { ok: false, code: "UNAUTHORIZED", error: "This invitation is for a different email address" };
  }

  if (invitation.status === InvitationStatus.CANCELLED) {
    return { ok: false, code: "CANCELLED", error: "This invitation was cancelled" };
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    return { ok: false, code: "ACCEPTED", error: "This invitation has already been accepted" };
  }

  if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt < new Date()) {
    if (invitation.status === InvitationStatus.PENDING) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
    }

    return { ok: false, code: "EXPIRED", error: "This invitation has expired" };
  }

  return {
    ok: true,
    invitation: {
      companyName: invitation.company.name,
      companySlug: invitation.company.slug,
      role: invitation.role,
      email: invitation.email,
      invitedByName: invitation.invitedByUser.name ?? invitation.invitedByUser.email,
      invitedAt: invitation.invitedAt,
      expiresAt: invitation.expiresAt,
    },
  };
}

export async function acceptInvitationByToken(
  currentUser: CurrentUserContext,
  rawToken: string
): Promise<{ ok: true; companySlug: string } | { ok: false; code: string; error: string }> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, code: "INVALID_TOKEN", error: "Missing invitation token" };
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: token },
    include: {
      company: {
        select: { id: true, slug: true, name: true },
      },
    },
  });

  if (!invitation) {
    return { ok: false, code: "INVALID_TOKEN", error: "Invitation not found" };
  }

  if (normalizeEmail(invitation.email) !== normalizeEmail(currentUser.email)) {
    return { ok: false, code: "UNAUTHORIZED", error: "This invitation is for a different email address" };
  }

  if (invitation.status === InvitationStatus.CANCELLED) {
    return { ok: false, code: "CANCELLED", error: "This invitation was cancelled" };
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    return { ok: true, companySlug: invitation.company.slug };
  }

  if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt < new Date()) {
    if (invitation.status === InvitationStatus.PENDING) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
    }

    return { ok: false, code: "EXPIRED", error: "This invitation has expired" };
  }

  if (currentUser.companyId && currentUser.companyId !== invitation.company.id) {
    return {
      ok: false,
      code: "ALREADY_IN_ANOTHER_COMPANY",
      error: "You are already in another company. Leave it first to accept this invitation.",
    };
  }

  if (!currentUser.companyId) {
    try {
      const limitCheck = await checkFeatureLimit(invitation.company.id, "user", 1);
      if (!limitCheck.allowed) {
        return {
          ok: false,
          code: "LIMIT_EXCEEDED",
          error: limitCheck.reason ?? "This company has reached its user limit",
        };
      }
    } catch (error) {
      if (error instanceof FeatureGateError) {
        return { ok: false, code: "LIMIT_EXCEEDED", error: error.message };
      }
      throw error;
    }
  }

  const resultingRole =
    invitation.role === UserRole.ADMIN || currentUser.role === UserRole.ADMIN
      ? UserRole.ADMIN
      : UserRole.MEMBER;

  const accepted = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        status: InvitationStatus.PENDING,
      },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      return false;
    }

    await tx.user.update({
      where: { id: currentUser.id },
      data: {
        companyId: invitation.company.id,
        role: resultingRole,
      },
    });

    return true;
  });

  if (!accepted) {
    return { ok: false, code: "ACCEPTED", error: "Invitation is no longer available" };
  }

  try {
    await createNotification(invitation.invitedBy, {
      type: "SUCCESS",
      title: "Invitation Accepted",
      message: `${getDisplayName(currentUser)} joined "${invitation.company.name}"`,
      actionUrl: "/dashboard/team",
    });
  } catch (error) {
    console.error("Failed to create invitation accepted notification:", error);
  }

  return { ok: true, companySlug: invitation.company.slug };
}
