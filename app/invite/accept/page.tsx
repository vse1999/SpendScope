import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInvitationByToken } from "@/app/actions/team";
import { AcceptInvitationForm } from "@/components/invitations/accept-invitation-form";

export const metadata: Metadata = {
  title: "Accept Invitation",
  description: "Accept a team invitation in SpendScope.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

interface AcceptInvitePageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

function buildLoginRedirect(token: string): string {
  const redirectTo = `/invite/accept?token=${encodeURIComponent(token)}`;
  return `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  if (!token) {
    return (
      <main className="min-h-screen app-shell p-4">
        <div className="mx-auto max-w-md pt-16">
          <Card>
            <CardHeader>
              <CardTitle>Invalid invitation link</CardTitle>
              <CardDescription>The invitation token is missing.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const session = await auth();
  if (!session?.user) {
    redirect(buildLoginRedirect(token));
  }

  const invitationResult = await getInvitationByToken(token);

  if (!invitationResult.success) {
    return (
      <main className="min-h-screen app-shell p-4">
        <div className="mx-auto max-w-md pt-16">
          <Card>
            <CardHeader>
              <CardTitle>Unable to accept invitation</CardTitle>
              <CardDescription>{invitationResult.error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/onboarding">Go to onboarding</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const invitation = invitationResult.invitation;
  return (
    <main className="min-h-screen app-shell p-4">
      <div className="mx-auto max-w-md pt-16">
        <Card>
          <CardHeader>
            <CardTitle>Join {invitation.companyName}</CardTitle>
            <CardDescription>
              You&apos;re invited by {invitation.invitedByName} to join as {invitation.role.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span> {invitation.email}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Role:</span>{" "}
                <Badge variant={invitation.role === "ADMIN" ? "default" : "secondary"}>
                  {invitation.role}
                </Badge>
              </p>
              <p className="mt-1 text-muted-foreground">
                Expires: {new Date(invitation.expiresAt).toLocaleString("en-US")}
              </p>
            </div>
            <AcceptInvitationForm token={token} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

