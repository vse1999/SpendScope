'use client'

import React, { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Notification, NotificationContextValue } from '@/types/notifications'
import {
  createUserNotification,
  deleteNotification,
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/app/actions/notifications'
import { createLogger } from '@/lib/monitoring/logger'
import { toast } from 'sonner'

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

const logger = createLogger('notification-provider')

function mapNotification(notification: {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: Date | string
  actionUrl: string | null
}): Notification {
  return {
    id: notification.id,
    type: notification.type.toLowerCase() as Notification['type'],
    title: notification.title,
    message: notification.message,
    read: notification.read,
    createdAt: new Date(notification.createdAt),
    actionUrl: notification.actionUrl ?? undefined,
  }
}

export function NotificationProvider({ children }: NotificationProviderProps): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const result = await getUnreadNotificationCount()
      if (result.success && typeof result.unreadCount === 'number') {
        setUnreadCount(result.unreadCount)
      } else if (result.error) {
        logger.error('Failed to load unread notification count', { error: result.error })
      }
    } catch (error) {
      logger.error('Error loading unread notification count', { error })
    }
  }, [])

  const refreshNotifications = useCallback(async (showLoading = false): Promise<void> => {
    if (showLoading) {
      setIsLoading(true)
    }

    try {
      const result = await getUserNotifications()
      if (result.success && result.notifications) {
        const parsedNotifications = result.notifications.map(mapNotification)
        setNotifications(parsedNotifications)
        setUnreadCount(parsedNotifications.filter((notification) => !notification.read).length)
        setHasLoaded(true)
      } else if (result.error) {
        logger.error('Failed to load notifications', { error: result.error })
      }
    } catch (error) {
      logger.error('Error loading notifications', { error })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const ensureLoaded = useCallback(async (): Promise<void> => {
    if (hasLoaded || isLoading) {
      return
    }

    await refreshNotifications(true)
  }, [hasLoaded, isLoading, refreshNotifications])

  useEffect(() => {
    void loadUnreadCount()
  }, [loadUnreadCount])

  const addNotification = useCallback(
    async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<void> => {
      try {
        const result = await createUserNotification({
          type: notification.type.toUpperCase() as 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR',
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
        })

        if (result.success && result.notification) {
          const nextNotification = mapNotification(result.notification)
          setUnreadCount((currentUnreadCount) => currentUnreadCount + 1)
          setNotifications((currentNotifications) =>
            hasLoaded ? [nextNotification, ...currentNotifications] : currentNotifications
          )
          return
        }

        if (result.error) {
          logger.error('Failed to create notification', { error: result.error })
        }
      } catch (error) {
        logger.error('Failed to create notification', { error })
      }

      toast.error('Failed to create notification')
    },
    [hasLoaded]
  )

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      const targetNotification = notifications.find((notification) => notification.id === id)
      if (!targetNotification || targetNotification.read) {
        return
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      )
      setUnreadCount((currentUnreadCount) => Math.max(0, currentUnreadCount - 1))

      try {
        const result = await markNotificationAsRead(id)
        if (result.success) {
          return
        }

        if (result.error) {
          logger.error('Failed to mark notification as read', { id, error: result.error })
        }
      } catch (error) {
        logger.error('Failed to mark notification as read', { id, error })
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === id ? { ...notification, read: false } : notification
        )
      )
      setUnreadCount((currentUnreadCount) => currentUnreadCount + 1)
      toast.error('Failed to mark as read')
    },
    [notifications]
  )

  const markAllAsRead = useCallback(async (): Promise<void> => {
    const hasUnread = notifications.some((notification) => !notification.read)
    if (!hasUnread) {
      return
    }

    const previousNotifications = notifications

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({ ...notification, read: true }))
    )
    setUnreadCount(0)

    try {
      const result = await markAllNotificationsAsRead()
      if (result.success) {
        return
      }

      if (result.error) {
        logger.error('Failed to mark all notifications as read', { error: result.error })
      }
    } catch (error) {
      logger.error('Failed to mark all notifications as read', { error })
    }

    setNotifications(previousNotifications)
    setUnreadCount(previousNotifications.filter((notification) => !notification.read).length)
    toast.error('Failed to mark all as read')
  }, [notifications])

  const removeNotification = useCallback(
    async (id: string): Promise<void> => {
      const notificationToRemove = notifications.find((notification) => notification.id === id)
      if (!notificationToRemove) {
        return
      }

      setNotifications((currentNotifications) =>
        currentNotifications.filter((notification) => notification.id !== id)
      )
      if (!notificationToRemove.read) {
        setUnreadCount((currentUnreadCount) => Math.max(0, currentUnreadCount - 1))
      }

      try {
        const result = await deleteNotification(id)
        if (result.success) {
          return
        }

        if (result.error) {
          logger.error('Failed to delete notification', { id, error: result.error })
        }
      } catch (error) {
        logger.error('Failed to delete notification', { id, error })
      }

      setNotifications((currentNotifications) =>
        [notificationToRemove, ...currentNotifications].sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
        )
      )
      if (!notificationToRemove.read) {
        setUnreadCount((currentUnreadCount) => currentUnreadCount + 1)
      }
      toast.error('Failed to delete notification')
    },
    [notifications]
  )

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      hasLoaded,
      isLoading,
      addNotification,
      ensureLoaded,
      refreshNotifications: () => refreshNotifications(false),
      markAsRead,
      markAllAsRead,
      removeNotification,
    }),
    [
      notifications,
      unreadCount,
      hasLoaded,
      isLoading,
      addNotification,
      ensureLoaded,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      removeNotification,
    ]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
