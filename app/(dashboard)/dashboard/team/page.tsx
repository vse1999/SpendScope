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

  // Extract data or use defaults
  const members = membersResult.success ? membersResult.members : [];
  const isAdmin = membersResult.success ? membersResult.isAdmin : false;
  const currentUserId = membersResult.success ? membersResult.currentUserId : "";
  const billingEnabled = isBillingEnabled();
  
  const pendingInvitations = invitationsResult.success ? invitationsResult.invitations : [];
  const roleAuditEvents = roleAuditResult.success ? roleAuditResult.audits : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="app-page-title">
          <span className="app-page-title-gradient">Team Members</span>
        </h1>
        <p className="text-muted-foreground">
          Manage your team and their access
        </p>
      </div>

      <TeamClient
        members={members}
        pendingInvitations={pendingInvitations}
        isAdmin={isAdmin}
        billingEnabled={billingEnabled}
        currentUserId={currentUserId}
        roleAuditEvents={roleAuditEvents}
      />
    </div>
  );
}
