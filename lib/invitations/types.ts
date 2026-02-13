import { InvitationStatus, UserRole } from "@prisma/client";

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  invitedAt: Date;
  expiresAt: Date;
  invitedBy: {
    name: string | null;
    email: string;
  };
}

export interface InvitationPreview {
  companyName: string;
  companySlug: string;
  role: UserRole;
  email: string;
  invitedByName: string;
  invitedAt: Date;
  expiresAt: Date;
}

export interface CurrentUserContext {
  id: string;
  role: UserRole;
  companyId: string | null;
  name: string | null;
  email: string;
}

export interface InviteTeamMemberInput {
  email: string;
  role: UserRole;
}

export interface TeamRoleAuditEntry {
  id: string;
  actorUserId: string;
  actorDisplayName: string;
  targetUserId: string;
  targetDisplayName: string;
  fromRole: UserRole;
  toRole: UserRole;
  createdAt: Date;
}

