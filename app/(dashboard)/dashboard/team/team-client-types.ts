import { UserRole } from "@prisma/client";

export type MemberActionType = "PROMOTE" | "DEMOTE" | "REMOVE";

export interface PendingMemberAction {
  userId: string;
  memberName: string;
  action: MemberActionType;
}

export function resolveRoleTarget(action: MemberActionType): UserRole {
  return action === "PROMOTE" ? UserRole.ADMIN : UserRole.MEMBER;
}
