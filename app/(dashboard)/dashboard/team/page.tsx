import { auth } from "@/auth";
import { getTeamMembers, getPendingInvitations } from "@/app/actions/team";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
  // session.user and company are guaranteed by (dashboard)/layout.tsx guards
  await auth();

  // Fetch team members and pending invitations in parallel
  const [membersResult, invitationsResult] = await Promise.all([
    getTeamMembers(),
    getPendingInvitations(),
  ]);

  // Extract data or use defaults
  const members = membersResult.success ? membersResult.members : [];
  const isAdmin = membersResult.success ? membersResult.isAdmin : false;
  const currentUserId = membersResult.success ? membersResult.currentUserId : "";
  
  const pendingInvitations = invitationsResult.success ? invitationsResult.invitations : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground">
          Manage your team and their access
        </p>
      </div>

      <TeamClient
        members={members}
        pendingInvitations={pendingInvitations}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
    </div>
  );
}
