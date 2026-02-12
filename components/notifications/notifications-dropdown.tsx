'use client'

import React, { useCallback, useMemo } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
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
  onMarkAsRead: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: NotificationItemProps): React.JSX.Element {
  const Icon = notificationIcons[notification.type]
  const [isMarking, setIsMarking] = React.useState(false)
  const [isRemoving, setIsRemoving] = React.useState(false)

  const handleClick = useCallback(async (): Promise<void> => {
    if (!notification.read && !isMarking) {
      setIsMarking(true)
      try {
        await onMarkAsRead(notification.id)
      } finally {
        setIsMarking(false)
      }
    }
  }, [notification.id, notification.read, isMarking, onMarkAsRead])

  const handleRemove = useCallback(
    async (e: React.MouseEvent): Promise<void> => {
      e.stopPropagation()
      if (isRemoving) return
      setIsRemoving(true)
      try {
        await onRemove(notification.id)
      } finally {
        setIsRemoving(false)
      }
    },
    [notification.id, isRemoving, onRemove]
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
        'group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-all',
        'hover:bg-accent/50 focus:bg-accent/50 focus:outline-none',
        !notification.read 
          ? 'bg-accent/40 border-l-2 border-l-primary' 
          : 'bg-transparent opacity-75'
      )}
    >
      {/* Unread indicator dot */}
      {!notification.read && (
        <span className="absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ml-2',
          notificationStyles[notification.type],
          notification.read && 'opacity-60'
        )}
      >
        {isMarking ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Icon className="size-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-2">
        <p
          className={cn(
            'text-sm leading-tight',
            !notification.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
          )}
        >
          {notification.title}
        </p>
        <p className={cn(
          "mt-0.5 line-clamp-2 text-xs",
          !notification.read ? 'text-foreground/80' : 'text-muted-foreground'
        )}>
          {notification.message}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-xs text-muted-foreground/70">
            {formatRelativeTime(notification.createdAt)}
          </p>
          {!notification.read && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 h-6 w-6 shrink-0"
        onClick={handleRemove}
        disabled={isRemoving}
        aria-label="Remove notification"
      >
        {isRemoving ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <X className="size-3" />
        )}
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

function LoadingState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">Loading notifications...</p>
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
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()
  const [isMarkingAll, setIsMarkingAll] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const hasNotifications = notifications.length > 0

  const sortedNotifications = useMemo(() => {
    // Sort: unread first, then by date
    return [...notifications].sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1
      }
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }, [notifications])

  const handleMarkAllAsRead = useCallback(async (): Promise<void> => {
    if (isMarkingAll) return
    setIsMarkingAll(true)
    try {
      await markAllAsRead()
    } finally {
      setIsMarkingAll(false)
    }
  }, [isMarkingAll, markAllAsRead])

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true)
    // Force a page reload to get fresh data
    window.location.reload()
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || <span />}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {unreadCount === 0 && notifications.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({notifications.length} total)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
              >
                {isMarkingAll ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <CheckCheck className="mr-1 size-3" />
                )}
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh notifications"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <LoadingState />
          ) : hasNotifications ? (
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
        {!isLoading && hasNotifications && (
          <>
            <Separator />
            <div className="p-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground px-2">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                asChild
              >
                <a href="/notifications">View all</a>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
