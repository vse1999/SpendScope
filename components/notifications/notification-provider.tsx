'use client'

import React, { createContext, useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from 'react'
import type { Notification, NotificationContextValue } from '@/types/notifications'
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createUserNotification,
} from '@/app/actions/notifications'
import { toast } from 'sonner'

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: NotificationProviderProps): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Fetch notifications from database
  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true)
    }
    
    try {
      const result = await getUserNotifications()
      if (!isMountedRef.current) return

      if (result.success && result.notifications) {
        // Convert Date strings to Date objects and map types
        const parsedNotifications: Notification[] = result.notifications.map(n => ({
          id: n.id,
          type: n.type.toLowerCase() as Notification['type'],
          title: n.title,
          message: n.message,
          read: n.read,
          createdAt: new Date(n.createdAt),
          actionUrl: n.actionUrl ?? undefined,
        }))
        setNotifications(parsedNotifications)
      } else if (result.error) {
        console.error('[NotificationProvider] Failed to load notifications:', result.error)
      }
    } catch (error) {
      console.error('[NotificationProvider] Error loading notifications:', error)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // Initial load
  useEffect(() => {
    isMountedRef.current = true
    loadNotifications(true)
    
    return () => {
      isMountedRef.current = false
    }
  }, [loadNotifications])

  // Refresh when lastRefresh changes (triggered after mark as read)
  useEffect(() => {
    if (lastRefresh > 0) {
      loadNotifications(false)
    }
  }, [lastRefresh, loadNotifications])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

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
          const newNotification: Notification = {
            id: result.notification.id,
            type: result.notification.type.toLowerCase() as Notification['type'],
            title: result.notification.title,
            message: result.notification.message,
            read: result.notification.read,
            createdAt: new Date(result.notification.createdAt),
            actionUrl: result.notification.actionUrl ?? undefined,
          }
          setNotifications((prev) => [newNotification, ...prev])
        }
      } catch (error) {
        console.error('Failed to create notification:', error)
        toast.error('Failed to create notification')
      }
    },
    []
  )

  const markAsRead = useCallback(async (id: string): Promise<void> => {
    console.log(`[NotificationProvider] Marking notification ${id} as read`)
    
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    )

    // Sync with database
    try {
      const result = await markNotificationAsRead(id)
      console.log(`[NotificationProvider] markNotificationAsRead result:`, result)
      
      if (!result.success) {
        console.error(`[NotificationProvider] Failed to mark as read:`, result.error)
        // Revert on failure
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id ? { ...notification, read: false } : notification
          )
        )
        toast.error(result.error || 'Failed to mark as read')
      } else {
        // Force a refresh to ensure sync
        setTimeout(() => {
          setLastRefresh(Date.now())
        }, 100)
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      // Revert on error
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, read: false } : notification
        )
      )
      toast.error('Failed to mark as read')
    }
  }, [])

  const markAllAsRead = useCallback(async (): Promise<void> => {
    console.log(`[NotificationProvider] Marking all notifications as read`)
    
    // Store previous state for potential revert
    const previousNotifications = notifications

    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    )

    // Sync with database
    try {
      const result = await markAllNotificationsAsRead()
      console.log(`[NotificationProvider] markAllNotificationsAsRead result:`, result)
      
      if (!result.success) {
        console.error(`[NotificationProvider] Failed to mark all as read:`, result.error)
        // Revert on failure
        setNotifications(previousNotifications)
        toast.error(result.error || 'Failed to mark all as read')
      } else {
        // Force a refresh to ensure sync
        setTimeout(() => {
          setLastRefresh(Date.now())
        }, 100)
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      // Revert on error
      setNotifications(previousNotifications)
      toast.error('Failed to mark all as read')
    }
  }, [notifications])

  const removeNotification = useCallback(async (id: string): Promise<void> => {
    // Store notification for potential revert
    const notificationToRemove = notifications.find(n => n.id === id)

    // Optimistically update UI
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))

    // Sync with database
    try {
      const result = await deleteNotification(id)
      if (!result.success) {
        // Revert on failure
        if (notificationToRemove) {
          setNotifications((prev) => [notificationToRemove, ...prev].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          ))
        }
        toast.error(result.error || 'Failed to delete notification')
      } else {
        // Force a refresh to ensure sync
        setTimeout(() => {
          setLastRefresh(Date.now())
        }, 100)
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
      // Revert on error
      if (notificationToRemove) {
        setNotifications((prev) => [notificationToRemove, ...prev].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        ))
      }
      toast.error('Failed to delete notification')
    }
  }, [notifications])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    // Clear any existing interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(async () => {
      console.log('[NotificationProvider] Polling for notifications...')
      await loadNotifications(false)
    }, 30000) // 30 seconds

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [loadNotifications])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
    }),
    [notifications, unreadCount, isLoading, addNotification, markAsRead, markAllAsRead, removeNotification]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
