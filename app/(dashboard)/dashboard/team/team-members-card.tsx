"use client";

import {
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Shield,
  User,
  Users,
  UserX,
} from "lucide-react";
import { UserRole } from "@prisma/client";
import type { TeamMember } from "@/lib/invitations/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberActionType } from "./team-client-types";

interface TeamMembersCardProps {
  members: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
  adminCount: number;
  isInviteDialogOpen: boolean;
  isInviting: boolean;
  inviteEmail: string;
  inviteRole: UserRole;
  hasPendingMutation: boolean;
  onOpenInviteDialog: (open: boolean) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: UserRole) => void;
  onSubmitInvite: () => Promise<void>;
  onMemberAction: (userId: string, memberName: string, action: MemberActionType) => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((segment) => segment[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return email.slice(0, 2).toUpperCase();
}

function getRoleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" {
  if (role === UserRole.ADMIN) {
    return "default";
  }

  if (role === UserRole.MEMBER) {
    return "secondary";
  }

  return "outline";
}

export function TeamMembersCard({
  members,
  isAdmin,
  currentUserId,
  adminCount,
  isInviteDialogOpen,
  isInviting,
  inviteEmail,
  inviteRole,
  hasPendingMutation,
  onOpenInviteDialog,
  onInviteEmailChange,
  onInviteRoleChange,
  onSubmitInvite,
  onMemberAction,
}: TeamMembersCardProps): React.JSX.Element {
  return (
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
          <Dialog open={isInviteDialogOpen} onOpenChange={onOpenInviteDialog}>
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
                  Send an invitation to join your company. They will receive an email with instructions
                  to accept the invitation.
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
                    onChange={(event) => onInviteEmailChange(event.target.value)}
                    disabled={isInviting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => onInviteRoleChange(value as UserRole)}
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
                <Button variant="outline" onClick={() => onOpenInviteDialog(false)} disabled={isInviting}>
                  Cancel
                </Button>
                <Button onClick={onSubmitInvite} disabled={isInviting}>
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
                <TableCell colSpan={isAdmin ? 4 : 3} className="py-8 text-center text-muted-foreground">
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
                                disabled={hasPendingMutation}
                                onSelect={() =>
                                  onMemberAction(member.id, member.name || member.email, "PROMOTE")
                                }
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Promote to Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={adminCount <= 1 || hasPendingMutation}
                                onSelect={() =>
                                  onMemberAction(member.id, member.name || member.email, "DEMOTE")
                                }
                              >
                                <User className="mr-2 h-4 w-4" />
                                Change to Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              variant="destructive"
                              className="text-destructive"
                              disabled={hasPendingMutation}
                              onSelect={() => onMemberAction(member.id, member.name || member.email, "REMOVE")}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Remove Member
                            </DropdownMenuItem>
                            {member.role === UserRole.ADMIN && adminCount <= 1 && (
                              <DropdownMenuItem disabled>Last admin cannot be demoted</DropdownMenuItem>
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
  );
}
