"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PendingMemberAction } from "./team-client-types";

interface MemberActionDialogProps {
  pendingAction: PendingMemberAction | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

function getMemberActionTitle(action: PendingMemberAction["action"]): string {
  if (action === "PROMOTE") {
    return "Promote to Admin";
  }

  if (action === "DEMOTE") {
    return "Change to Member";
  }

  return "Remove Team Member";
}

function getMemberActionDescription(pendingAction: PendingMemberAction): React.JSX.Element {
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
}

export function MemberActionDialog({
  pendingAction,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: MemberActionDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={pendingAction !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {pendingAction ? getMemberActionTitle(pendingAction.action) : "Confirm Action"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pendingAction ? getMemberActionDescription(pendingAction) : "No action selected."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={pendingAction?.action === "REMOVE" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
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
  );
}
