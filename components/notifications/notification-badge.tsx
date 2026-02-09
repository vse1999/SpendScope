'use client'

import type React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  className?: string
  onClick?: () => void
}

export function NotificationBadge({ count, className, onClick }: NotificationBadgeProps): React.JSX.Element {
  const displayCount = count > 99 ? '99+' : count

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      onClick={onClick}
      aria-label={`Notifications ${count > 0 ? `(${count} unread)` : ''}`}
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground ring-2 ring-background animate-in zoom-in-50 duration-200">
          {displayCount}
        </span>
      )}
    </Button>
  )
}
