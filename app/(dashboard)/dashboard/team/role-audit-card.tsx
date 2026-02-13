"use client";

import { Shield } from "lucide-react";
import { UserRole } from "@prisma/client";
import type { TeamRoleAuditEntry } from "@/lib/invitations/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RoleAuditCardProps {
  roleAuditEvents: TeamRoleAuditEntry[];
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

export function RoleAuditCard({ roleAuditEvents }: RoleAuditCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role Change Audit Log
        </CardTitle>
        <CardDescription>Most recent role changes for your company team.</CardDescription>
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
  );
}
