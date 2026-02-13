"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  MoreHorizontal,
  UserX,
  Mail,
  Clock,
  RefreshCw,
  X,
  Shield,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  inviteTeamMember,
  removeTeamMember,
  cancelInvitation,
  resendInvitation,
  updateTeamMemberRole,
} from "@/app/actions/team";
import { UserRole } from "@prisma/client";
import type { Invitation, TeamMember, TeamRoleAuditEntry } from "@/lib/invitations/types";

interface TeamClientProps {
  members: TeamMember[];
  pendingInvitations: Invitation[];
  roleAuditEvents: TeamRoleAuditEntry[];
  isAdmin: boolean;
  currentUserId: string;
}

type MemberActionType = "PROMOTE" | "DEMOTE" | "REMOVE";

interface PendingMemberAction {
  userId: string;
  memberName: string;
  action: MemberActionType;
}

export function TeamClient({
  members,
  pendingInvitations,
  roleAuditEvents,
  isAdmin,
  currentUserId,
}: TeamClientProps): React.JSX.Element {
  const router = useRouter();
  const adminCount = members.filter((member) => member.role === UserRole.ADMIN).length;
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<PendingMemberAction | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.MEMBER);

  const handleInvite = async (): Promise<void> => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsInviting(true);

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
    } else {
      toast.error(result.error);
    }

    setIsInviting(false);
  };

  const handleRemoveMember = async (userId: string): Promise<void> => {
    setIsRemoving(userId);

    const result = await removeTeamMember(userId);

    if (result.success) {
      toast.success("Team member removed successfully");
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setIsRemoving(null);
  };

  const handleCancelInvitation = async (invitationId: string): Promise<void> => {
    setIsCancelling(invitationId);

    const result = await cancelInvitation(invitationId);

    if (result.success) {
      toast.success("Invitation cancelled");
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setIsCancelling(null);
  };

  const handleResendInvitation = async (invitationId: string): Promise<void> => {
    setIsResending(invitationId);

    const result = await resendInvitation(invitationId);

    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setIsResending(null);
  };

  const handleUpdateMemberRole = async (userId: string, nextRole: UserRole): Promise<void> => {
    setIsUpdatingRole(userId);

    const result = await updateTeamMemberRole(userId, nextRole);

    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      if (result.code === "LAST_ADMIN") {
        toast.error("Cannot change the last admin", {
          description: "Promote another member to admin first.",
        });
      } else {
        toast.error(result.error);
      }
    }

    setIsUpdatingRole(null);
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

    const nextRole = pendingMemberAction.action === "PROMOTE" ? UserRole.ADMIN : UserRole.MEMBER;
    await handleUpdateMemberRole(pendingMemberAction.userId, nextRole);
    setPendingMemberAction(null);
  };

  const getInitials = (name: string | null, email: string): string => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "outline" => {
    switch (role) {
      case UserRole.ADMIN:
        return "default";
      case UserRole.MEMBER:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getMemberActionTitle = (action: MemberActionType): string => {
    if (action === "PROMOTE") {
      return "Promote to Admin";
    }

    if (action === "DEMOTE") {
      return "Change to Member";
    }

    return "Remove Team Member";
  };

  const getMemberActionDescription = (pendingAction: PendingMemberAction): React.JSX.Element => {
    if (pendingAction.action === "PROMOTE") {
      return (
        <>
          Promote <strong>{pendingAction.memberName}</strong> to <strong>ADMIN</strong>? This grants full
          access to team, billing, and company management.
        </>
      );
    }

    if (pendingAction.action === "DEMOTE") {
      return (
        <>
          Change <strong>{pendingAction.memberName}</strong> to <strong>MEMBER</strong>? They will lose admin
          permissions. This action is blocked if they are the last admin.
        </>
      );
    }

    return (
      <>
        Remove <strong>{pendingAction.memberName}</strong> from your company? This action cannot be undone.
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Team Members Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? "s" : ""} in your company
            </CardDescription>
            {isAdmin && adminCount <= 1 && (
              <p className="text-xs text-muted-foreground">
                At least one admin is required. Promote another member before demoting the current admin.
              </p>
            )}
          </div>
          {isAdmin && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your company. They will receive an email with
                    instructions to accept the invitation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={isInviting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value) => setInviteRole(value as UserRole)}
                      disabled={isInviting}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.MEMBER}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Member - Can add and manage their own expenses
                          </div>
                        </SelectItem>
                        <SelectItem value={UserRole.ADMIN}>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin - Full access to manage company and team
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                    disabled={isInviting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={isInviting}>
                    {isInviting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 4 : 3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No team members found
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.image || undefined} alt={member.name || member.email} />
                          <AvatarFallback>{getInitials(member.name, member.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.name || "Unnamed User"}
                            {member.id === currentUserId && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role === UserRole.ADMIN ? (
                          <Shield className="mr-1 h-3 w-3" />
                        ) : (
                          <User className="mr-1 h-3 w-3" />
                        )}
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {member.id !== currentUserId ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.role === UserRole.MEMBER ? (
                                <DropdownMenuItem
                                  disabled={isUpdatingRole !== null || isRemoving !== null}
                                  onSelect={() =>
                                    openMemberActionDialog(member.id, member.name || member.email, "PROMOTE")
                                  }
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Promote to Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  disabled={adminCount <= 1 || isUpdatingRole !== null || isRemoving !== null}
                                  onSelect={() =>
                                    openMemberActionDialog(member.id, member.name || member.email, "DEMOTE")
                                  }
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  Change to Member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                variant="destructive"
                                className="text-destructive"
                                disabled={isUpdatingRole !== null || isRemoving !== null}
                                onSelect={() =>
                                  openMemberActionDialog(member.id, member.name || member.email, "REMOVE")
                                }
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Remove Member
                              </DropdownMenuItem>
                              {member.role === UserRole.ADMIN && adminCount <= 1 && (
                                <DropdownMenuItem disabled>
                                  Last admin cannot be demoted
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Change Audit Log
            </CardTitle>
            <CardDescription>
              Most recent role changes for your company team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roleAuditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No role changes recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {roleAuditEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm">
                      <strong>{event.actorDisplayName}</strong> changed{" "}
                      <strong>{event.targetDisplayName}</strong> from{" "}
                      <Badge variant={getRoleBadgeVariant(event.fromRole)} className="mx-1">
                        {event.fromRole}
                      </Badge>
                      to
                      <Badge variant={getRoleBadgeVariant(event.toRole)} className="mx-1">
                        {event.toRole}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={pendingMemberAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMemberAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingMemberAction ? getMemberActionTitle(pendingMemberAction.action) : "Confirm Action"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMemberAction ? getMemberActionDescription(pendingMemberAction) : "No action selected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving !== null || isUpdatingRole !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant={pendingMemberAction?.action === "REMOVE" ? "destructive" : "default"}
              onClick={runPendingMemberAction}
              disabled={isRemoving !== null || isUpdatingRole !== null}
            >
              {isRemoving !== null || isUpdatingRole !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending Invitations Card */}
      {isAdmin && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                {pendingInvitations.length} pending invitation
                {pendingInvitations.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(invitation.role)}>
                        {invitation.role === UserRole.ADMIN ? (
                          <Shield className="mr-1 h-3 w-3" />
                        ) : (
                          <User className="mr-1 h-3 w-3" />
                        )}
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(invitation.invitedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expiresAt) < new Date() ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendInvitation(invitation.id)}
                          disabled={isResending === invitation.id}
                        >
                          {isResending === invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="sr-only">Resend</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <X className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Cancel</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel the invitation sent to{" "}
                                <strong>{invitation.email}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => handleCancelInvitation(invitation.id)}
                                disabled={isCancelling === invitation.id}
                              >
                                {isCancelling === invitation.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cancelling...
                                  </>
                                ) : (
                                  "Cancel Invitation"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
