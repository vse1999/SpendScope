"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
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

    return { success: true, notifications };
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCount(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const count = await prisma.notification.count({
      where: { userId: session.user.id, read: false },
    });

    return { success: true, count };
  } catch (error) {
    console.error("Failed to fetch unread count:", error);
    return { success: false, error: "Failed to fetch unread count" };
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
