import { auth } from "@/auth";
import { getTeamMembers, getPendingInvitations, getTeamRoleAuditLog } from "@/app/actions/team";
import { isBillingEnabled } from "@/lib/stripe/config";
import { TeamClient } from "./team-client";

export default async function TeamPage(): Promise<React.JSX.Element> {
  // session.user and company are guaranteed by (dashboard)/layout.tsx guards
  await auth();

  // Fetch team members, pending invitations, and role audit history in parallel
  const [membersResult, invitationsResult, roleAuditResult] = await Promise.all([
    getTeamMembers(),
    getPendingInvitations(),
    getTeamRoleAuditLog(),
  ]);

  const membersError = membersResult.success ? null : membersResult.error;
  const members = membersResult.success ? membersResult.members : [];
  const isAdmin = membersResult.success ? membersResult.isAdmin : false;
  const currentUserId = membersResult.success ? membersResult.currentUserId : "";
  const billingEnabled = isBillingEnabled();
  const pendingInvitationsError =
    invitationsResult.success || invitationsResult.code === "UNAUTHORIZED"
      ? null
      : invitationsResult.error;
  const pendingInvitations = invitationsResult.success ? invitationsResult.invitations : [];
  const roleAuditError =
    roleAuditResult.success || roleAuditResult.code === "UNAUTHORIZED"
      ? null
      : roleAuditResult.error;
  const roleAuditEvents = roleAuditResult.success ? roleAuditResult.audits : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Team Members
        </h1>
        <p className="text-muted-foreground">
          Manage your team and their access
        </p>
      </div>

      <TeamClient
        members={members}
        membersError={membersError}
        pendingInvitations={pendingInvitations}
        pendingInvitationsError={pendingInvitationsError}
        isAdmin={isAdmin}
        billingEnabled={billingEnabled}
        currentUserId={currentUserId}
        roleAuditError={roleAuditError}
        roleAuditEvents={roleAuditEvents}
      />
    </div>
  );
}
