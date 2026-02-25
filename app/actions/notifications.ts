"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { getDisplayName, parseAuditRoleChangeMessage } from "@/lib/invitations/utils";
import { revalidatePath } from "next/cache";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

export interface NotificationResult {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: Date;
}

interface DisplayUser {
  id: string;
  name: string | null;
  email: string;
}

function formatRoleLabel(role: "ADMIN" | "MEMBER"): string {
  return role === "ADMIN" ? "Admin" : "Member";
}

function formatRoleAuditMessageForViewer(
  parsed: NonNullable<ReturnType<typeof parseAuditRoleChangeMessage>>,
  currentUserId: string,
  usersById: Map<string, DisplayUser>
): string {
  const actor = usersById.get(parsed.actorUserId);
  const target = usersById.get(parsed.targetUserId);

  const actorDisplayName = actor ? getDisplayName(actor) : "Someone";
  const targetDisplayName = target ? getDisplayName(target) : "a team member";

  const fromRole = formatRoleLabel(parsed.fromRole);
  const toRole = formatRoleLabel(parsed.toRole);

  if (parsed.actorUserId === currentUserId) {
    return `You changed role for ${targetDisplayName} from ${fromRole} to ${toRole}.`;
  }

  if (parsed.targetUserId === currentUserId) {
    return `${actorDisplayName} changed your role from ${fromRole} to ${toRole}.`;
  }

  return `${actorDisplayName} changed role for ${targetDisplayName} from ${fromRole} to ${toRole}.`;
}

async function formatNotificationsForDisplay(
  notifications: NotificationResult[],
  currentUserId: string
): Promise<NotificationResult[]> {
  const parsedByNotificationId = new Map<
    string,
    NonNullable<ReturnType<typeof parseAuditRoleChangeMessage>>
  >();
  const userIds = new Set<string>();

  for (const notification of notifications) {
    const parsed = parseAuditRoleChangeMessage(notification.message);
    if (!parsed) {
      continue;
    }

    parsedByNotificationId.set(notification.id, parsed);
    userIds.add(parsed.actorUserId);
    userIds.add(parsed.targetUserId);
  }

  if (parsedByNotificationId.size === 0) {
    return notifications;
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: Array.from(userIds),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const usersById = new Map(users.map((user) => [user.id, user]));

  return notifications.map((notification) => {
    const parsed = parsedByNotificationId.get(notification.id);
    if (!parsed) {
      return notification;
    }

    return {
      ...notification,
      message: formatRoleAuditMessageForViewer(parsed, currentUserId, usersById),
    };
  });
}

/**
 * Get all notifications for the current user
 * Uses noStore to ensure fresh data on every request
 */
export async function getUserNotifications(): Promise<{
  success: boolean;
  notifications?: NotificationResult[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 notifications
    });

    const formattedNotifications = await formatNotificationsForDisplay(
      notifications,
      session.user.id
    );

    return { success: true, notifications: formattedNotifications };
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[markNotificationAsRead] Not authenticated");
      return { success: false, error: "Not authenticated" };
    }

    // Verify the notification belongs to the current user
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: session.user.id },
    });

    if (!notification) {
      console.error(`[markNotificationAsRead] Notification not found: ${notificationId} for user: ${session.user.id}`);
      return { success: false, error: "Notification not found" };
    }

    // Update the notification - using updateMany for better reliability
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: session.user.id
      },
      data: {
        read: true,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      console.error(`[markNotificationAsRead] No rows updated for notification: ${notificationId}`);
      return { success: false, error: "Failed to update notification" };
    }

    console.log(`[markNotificationAsRead] Successfully marked notification ${notificationId} as read`);

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[markNotificationAsRead] Error:", error);
    return { success: false, error: "Failed to update notification" };
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const result = await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: {
        read: true,
        updatedAt: new Date(),
      },
    });

    console.log(`[markAllNotificationsAsRead] Marked ${result.count} notifications as read for user: ${session.user.id}`);

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[markAllNotificationsAsRead] Error:", error);
    return { success: false, error: "Failed to update notifications" };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify the notification belongs to the current user
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: session.user.id },
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return { success: false, error: "Failed to delete notification" };
  }
}

/**
 * Create a notification (for internal use by other actions)
 */
export async function createNotification(
  userId: string,
  input: NotificationInput
): Promise<{ success: boolean; notification?: NotificationResult; error?: string }> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
      },
    });

    console.log(`[createNotification] Created notification ${notification.id} for user: ${userId}`);

    return { success: true, notification };
  } catch (error) {
    console.error("[createNotification] Error:", error);
    return { success: false, error: "Failed to create notification" };
  }
}

/**
 * Create a notification for the current user
 */
export async function createUserNotification(
  input: NotificationInput
): Promise<{ success: boolean; notification?: NotificationResult; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    return createNotification(session.user.id, input);
  } catch (error) {
    console.error("[createUserNotification] Error:", error);
    return { success: false, error: "Failed to create notification" };
  }
}
