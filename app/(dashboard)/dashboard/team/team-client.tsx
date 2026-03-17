"use client";

import { useState } from "react";
import { UserRole } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  UpgradeToProDialog,
  useUpgradeToProDialog,
} from "@/components/entitlements";
import type { Invitation, TeamMember, TeamRoleAuditEntry } from "@/lib/invitations/types";
import {
  cancelInvitation,
  inviteTeamMember,
  removeTeamMember,
  resendInvitation,
  updateTeamMemberRole,
} from "@/app/actions/team";
import { MemberActionDialog } from "./member-action-dialog";
import { PendingInvitationsCard } from "./pending-invitations-card";
import { RoleAuditCard } from "./role-audit-card";
import { TeamMembersCard } from "./team-members-card";
import type { MemberActionType, PendingMemberAction } from "./team-client-types";
import { resolveRoleTarget } from "./team-client-types";

interface TeamClientProps {
  members: TeamMember[];
  membersError?: string | null;
  pendingInvitations: Invitation[];
  pendingInvitationsError?: string | null;
  roleAuditEvents: TeamRoleAuditEntry[];
  roleAuditError?: string | null;
  isAdmin: boolean;
  billingEnabled: boolean;
  currentUserId: string;
}

export function TeamClient({
  members,
  membersError,
  pendingInvitations,
  pendingInvitationsError,
  roleAuditEvents,
  roleAuditError,
  isAdmin,
  billingEnabled,
  currentUserId,
}: TeamClientProps): React.JSX.Element {
  const router = useRouter();
  const adminCount = members.filter((member) => member.role === UserRole.ADMIN).length;

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState<boolean>(false);
  const [isInviting, setIsInviting] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<PendingMemberAction | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.MEMBER);
  const {
    open: isUpgradeDialogOpen,
    context: upgradeDialogContext,
    openUpgradeDialog,
    onOpenChange: onUpgradeDialogOpenChange,
  } = useUpgradeToProDialog();

  const hasPendingMemberMutation = isUpdatingRole !== null || isRemoving !== null;

  const handleInvite = async (): Promise<void> => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsInviting(true);
    try {
      const formData = new FormData();
      formData.append("email", inviteEmail);
      formData.append("role", inviteRole);

      const result = await inviteTeamMember(formData);
      if (result.success) {
        toast.success(result.message);
        setInviteEmail("");
        setInviteRole(UserRole.MEMBER);
        setIsInviteDialogOpen(false);
        router.refresh();
        return;
      }

      if (result.code === "FORBIDDEN_FEATURE") {
        openUpgradeDialog({
          feature: "teamInvites",
          source: "team_invite",
          reason: result.error,
        });
        return;
      }

      if (result.code === "LIMIT_EXCEEDED") {
        openUpgradeDialog({
          feature: "userSeats",
          source: "team_invite",
          reason: result.error,
        });
        return;
      }

      toast.error(result.error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string): Promise<void> => {
    setIsRemoving(userId);
    try {
      const result = await removeTeamMember(userId);
      if (result.success) {
        toast.success("Team member removed successfully");
        router.refresh();
        return;
      }

      toast.error(result.error);
    } finally {
      setIsRemoving(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string): Promise<void> => {
    setIsCancelling(invitationId);
    try {
      const result = await cancelInvitation(invitationId);
      if (result.success) {
        toast.success("Invitation cancelled");
        router.refresh();
        return;
      }

      toast.error(result.error);
    } finally {
      setIsCancelling(null);
    }
  };

  const handleResendInvitation = async (invitationId: string): Promise<void> => {
    setIsResending(invitationId);
    try {
      const result = await resendInvitation(invitationId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.error);
    } finally {
      setIsResending(null);
    }
  };

  const handleUpdateMemberRole = async (userId: string, nextRole: UserRole): Promise<void> => {
    setIsUpdatingRole(userId);
    try {
      const result = await updateTeamMemberRole(userId, nextRole);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      if (result.code === "LAST_ADMIN") {
        toast.error("Cannot change the last admin", {
          description: "Promote another member to admin first.",
        });
        return;
      }

      toast.error(result.error);
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const openMemberActionDialog = (
    userId: string,
    memberName: string,
    action: MemberActionType
  ): void => {
    setPendingMemberAction({ userId, memberName, action });
  };

  const runPendingMemberAction = async (): Promise<void> => {
    if (!pendingMemberAction) {
      return;
    }

    if (pendingMemberAction.action === "REMOVE") {
      await handleRemoveMember(pendingMemberAction.userId);
      setPendingMemberAction(null);
      return;
    }

    await handleUpdateMemberRole(
      pendingMemberAction.userId,
      resolveRoleTarget(pendingMemberAction.action)
    );
    setPendingMemberAction(null);
  };

  return (
    <div className="min-w-0 space-y-6">
      <TeamMembersCard
        members={members}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        adminCount={adminCount}
        loadError={membersError}
        onRetry={() => {
          router.refresh();
        }}
        isInviteDialogOpen={isInviteDialogOpen}
        isInviting={isInviting}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        hasPendingMutation={hasPendingMemberMutation}
        onOpenInviteDialog={setIsInviteDialogOpen}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onSubmitInvite={handleInvite}
        onMemberAction={openMemberActionDialog}
      />

      {(Boolean(roleAuditError) || isAdmin) && (
        <RoleAuditCard
          roleAuditEvents={roleAuditEvents}
          loadError={roleAuditError}
          onRetry={() => {
            router.refresh();
          }}
        />
      )}

      <MemberActionDialog
        pendingAction={pendingMemberAction}
        isSubmitting={hasPendingMemberMutation}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMemberAction(null);
          }
        }}
        onConfirm={runPendingMemberAction}
      />

      {(Boolean(pendingInvitationsError) || (isAdmin && pendingInvitations.length > 0)) && (
        <PendingInvitationsCard
          pendingInvitations={pendingInvitations}
          isCancelling={isCancelling}
          loadError={pendingInvitationsError}
          isResending={isResending}
          onRetry={() => {
            router.refresh();
          }}
          onCancelInvitation={handleCancelInvitation}
          onResendInvitation={handleResendInvitation}
        />
      )}

      <UpgradeToProDialog
        open={isUpgradeDialogOpen}
        context={upgradeDialogContext}
        isAdmin={isAdmin}
        billingEnabled={billingEnabled}
        onOpenChange={onUpgradeDialogOpenChange}
      />
    </div>
  );
}
