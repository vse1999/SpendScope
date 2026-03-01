"use client";

import { Clock, Loader2, Mail, RefreshCw, Shield, User, X } from "lucide-react";
import { UserRole } from "@prisma/client";
import type { Invitation } from "@/lib/invitations/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PendingInvitationsCardProps {
  pendingInvitations: Invitation[];
  isCancelling: string | null;
  isResending: string | null;
  onCancelInvitation: (invitationId: string) => Promise<void>;
  onResendInvitation: (invitationId: string) => Promise<void>;
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

export function PendingInvitationsCard({
  pendingInvitations,
  isCancelling,
  isResending,
  onCancelInvitation,
  onResendInvitation,
}: PendingInvitationsCardProps): React.JSX.Element {
  return (
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
        <>
          <div className="space-y-3 md:hidden">
            {pendingInvitations.map((invitation) => {
              const isExpired = new Date(invitation.expiresAt) < new Date();

              return (
                <div key={invitation.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium">{invitation.email}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(invitation.role)}>
                      {invitation.role === UserRole.ADMIN ? (
                        <Shield className="mr-1 h-3 w-3" />
                      ) : (
                        <User className="mr-1 h-3 w-3" />
                      )}
                      {invitation.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Sent{" "}
                      {new Date(invitation.invitedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {isExpired ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Expires{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => onResendInvitation(invitation.id)}
                      disabled={isResending === invitation.id}
                    >
                      {isResending === invitation.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Resend
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-center text-destructive hover:text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
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
                            onClick={() => onCancelInvitation(invitation.id)}
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
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
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
                          onClick={() => onResendInvitation(invitation.id)}
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
                                onClick={() => onCancelInvitation(invitation.id)}
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
          </div>
        </>
      </CardContent>
    </Card>
  );
}
