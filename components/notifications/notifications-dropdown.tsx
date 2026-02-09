'use client'

import React, { useCallback, useMemo, type JSX } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  X,
  AlertCircle,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/use-notifications'
import type { Notification, NotificationType } from '@/types/notifications'

const notificationIcons: Record<NotificationType, typeof Info> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertCircle,
}

const notificationStyles: Record<NotificationType, string> = {
  info: 'bg-blue-500/10 text-blue-500',
  success: 'bg-green-500/10 text-green-500',
  warning: 'bg-yellow-500/10 text-yellow-500',
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

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onRemove: (id: string) => void
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: NotificationItemProps): React.JSX.Element {
  const Icon = notificationIcons[notification.type]

  const handleClick = useCallback((): void => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }, [notification.id, notification.read, onMarkAsRead])

  const handleRemove = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      onRemove(notification.id)
    },
    [notification.id, onRemove]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
      className={cn(
        'group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors',
        'hover:bg-accent/50 focus:bg-accent/50 focus:outline-none',
        !notification.read && 'bg-accent/30'
      )}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <span className="absolute left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          notificationStyles[notification.type]
        )}
      >
        <Icon className="size-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-2">
        <p
          className={cn(
            'text-sm font-medium leading-tight',
            !notification.read && 'font-semibold'
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 h-6 w-6 shrink-0"
        onClick={handleRemove}
        aria-label="Remove notification"
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}

function EmptyState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Bell className="size-5 text-muted-foreground" />
      </div>
      <h4 className="mt-3 text-sm font-medium">No notifications</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        We&apos;ll notify you when something arrives
      </p>
    </div>
  )
}

interface NotificationsDropdownProps {
  children?: React.ReactNode
}

export function NotificationsDropdown({
  children,
}: NotificationsDropdownProps): React.JSX.Element {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()

  const hasNotifications = notifications.length > 0

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  }, [notifications])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || <span />}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {hasNotifications ? (
            <div className="py-1">
              {sortedNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onRemove={removeNotification}
                  />
                  {index < sortedNotifications.length - 1 && (
                    <Separator className="mx-4 w-[calc(100%-2rem)]" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Footer */}
        {hasNotifications && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                asChild
              >
                <a href="/notifications">View all notifications</a>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
