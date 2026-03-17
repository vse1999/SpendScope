'use client'

import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Inbox,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import type { Notification, NotificationType } from '@/types/notifications'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const notificationIcons: Record<NotificationType, typeof AlertCircle> = {
  info: Bell,
  success: Check,
  warning: AlertTriangle,
  error: AlertCircle,
}

const notificationStyles: Record<NotificationType, string> = {
  info: 'bg-blue-500/10 text-blue-500',
  success: 'bg-green-500/10 text-green-500',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  error: 'bg-red-500/10 text-red-500',
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

interface NotificationListItemProps {
  notification: Notification
  onRead: (notification: Notification) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

function NotificationListItem({
  notification,
  onRead,
  onRemove,
}: NotificationListItemProps): React.JSX.Element {
  const Icon = notificationIcons[notification.type]
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRead = useCallback(async (): Promise<void> => {
    if (isMarkingRead || notification.read) {
      return
    }

    setIsMarkingRead(true)
    try {
      await onRead(notification)
    } finally {
      setIsMarkingRead(false)
    }
  }, [isMarkingRead, notification, onRead])

  const handleRemove = useCallback(async (): Promise<void> => {
    if (isRemoving) {
      return
    }

    setIsRemoving(true)
    try {
      await onRemove(notification.id)
    } finally {
      setIsRemoving(false)
    }
  }, [isRemoving, notification.id, onRemove])

  return (
    <li
      className={cn(
        'group flex items-start gap-2 px-3 py-3',
        !notification.read && 'bg-accent/25'
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'mt-1.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          notificationStyles[notification.type]
        )}
      >
        {isMarkingRead ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => void handleRead()}
          className={cn(
            'w-full rounded-md px-0 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !notification.read && 'hover:text-foreground',
            !notification.read ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={cn('truncate text-sm leading-tight', !notification.read && 'font-medium')}>
                {notification.title}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-tight text-muted-foreground">
                {notification.message}
              </p>
            </div>
            {!notification.read && (
              <span
                aria-label="Unread notification"
                className="mt-1 size-2 shrink-0 rounded-full bg-primary"
              />
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/70">
            <span>{formatRelativeTime(notification.createdAt)}</span>
          </div>
        </button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-0.5 size-7 shrink-0 opacity-70 transition-opacity hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        onClick={() => void handleRemove()}
        disabled={isRemoving}
        aria-label={`Remove notification: ${notification.title}`}
      >
        {isRemoving ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
      </Button>
    </li>
  )
}

export function NotificationsMenu(): React.JSX.Element {
  const {
    notifications,
    unreadCount,
    hasLoaded,
    isLoading,
    ensureLoaded,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()
  const [open, setOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    void ensureLoaded()

    const interval = window.setInterval(() => {
      void refreshNotifications()
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [open, ensureLoaded, refreshNotifications])

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((left, right) => {
      if (left.read !== right.read) {
        return left.read ? 1 : -1
      }

      return right.createdAt.getTime() - left.createdAt.getTime()
    })
  }, [notifications])

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true)
    try {
      await refreshNotifications()
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshNotifications])

  const handleMarkAllAsRead = useCallback(async (): Promise<void> => {
    if (isMarkingAll) {
      return
    }

    setIsMarkingAll(true)
    try {
      await markAllAsRead()
    } finally {
      setIsMarkingAll(false)
    }
  }, [isMarkingAll, markAllAsRead])

  const handleReadNotification = useCallback(
    async (notification: Notification): Promise<void> => {
      if (!notification.read) {
        await markAsRead(notification.id)
      }
    },
    [markAsRead]
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild id="dashboard-header-notifications-trigger">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground/60 hover:bg-accent/50 hover:text-foreground"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {sortedNotifications.length > 0 && unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => void handleMarkAllAsRead()}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Check className="mr-1 size-3" />}
                Mark all read
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing || (!hasLoaded && isLoading)}
              aria-label="Refresh notifications"
            >
              <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="max-h-[320px] overflow-y-auto">
          {!hasLoaded && isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
              <Inbox className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">You&apos;re all caught up!</p>
            </div>
          ) : (
            <ul className="divide-y" aria-label="Notifications list">
              {sortedNotifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleReadNotification}
                  onRemove={removeNotification}
                />
              ))}
            </ul>
          )}
        </div>

        {sortedNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
