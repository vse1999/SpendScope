'use client'

import React, { createContext, useCallback, useMemo, useState, type ReactNode, type JSX } from 'react'
import type { Notification, NotificationContextValue } from '@/types/notifications'

interface NotificationProviderProps {
  children: ReactNode
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: NotificationProviderProps): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): void => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        read: false,
        createdAt: new Date(),
      }

      setNotifications((prev) => [newNotification, ...prev])
    },
    []
  )

  const markAsRead = useCallback((id: string): void => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }, [])

  const markAllAsRead = useCallback((): void => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    )
  }, [])

  const removeNotification = useCallback((id: string): void => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
    }),
    [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
