import { UserRole } from "@prisma/client";

const ROLE_AUDIT_PREFIX = "ROLE_AUDIT_V1|";
const INVITATION_EXPIRY_DAYS = 7;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getAppBaseUrl(): string {
  const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error("APP_URL or NEXTAUTH_URL must be configured");
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function getInvitationAcceptUrl(token: string): string {
  return `${getAppBaseUrl()}/invite/accept?token=${encodeURIComponent(token)}`;
}

export function getInvitationExpiryDate(): Date {
  return new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export function getDisplayName(user: { name: string | null; email: string }): string {
  return user.name?.trim() ? user.name : user.email;
}

export function isSupportedUserRole(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.MEMBER;
}

export function getRoleAuditPrefix(): string {
  return ROLE_AUDIT_PREFIX;
}

export function parseAuditRoleChangeMessage(
  message: string
): { actorUserId: string; targetUserId: string; fromRole: UserRole; toRole: UserRole } | null {
  if (!message.startsWith(ROLE_AUDIT_PREFIX)) {
    return null;
  }

  const payload = message.slice(ROLE_AUDIT_PREFIX.length);
  const parts = payload.split("|");
  if (parts.length !== 4) {
    return null;
  }

  const [actorUserId, targetUserId, fromRoleRaw, toRoleRaw] = parts;
  if (!actorUserId || !targetUserId) {
    return null;
  }

  if (
    (fromRoleRaw !== UserRole.ADMIN && fromRoleRaw !== UserRole.MEMBER) ||
    (toRoleRaw !== UserRole.ADMIN && toRoleRaw !== UserRole.MEMBER)
  ) {
    return null;
  }

  return {
    actorUserId,
    targetUserId,
    fromRole: fromRoleRaw,
    toRole: toRoleRaw,
  };
}
