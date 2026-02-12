'use client'

import * as React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface NotificationBadgeProps {
  count: number
  className?: string
}

export const NotificationBadge = React.forwardRef<
  HTMLButtonElement,
  NotificationBadgeProps
>(({ count, className }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn(
        'relative h-8 w-8 text-muted-foreground/60 hover:text-foreground hover:bg-accent/50',
        className
      )}
      aria-label={`Notifications ${count > 0 ? `(${count} unread)` : ''}`}
    >
      <Bell className="size-4" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex size-2 rounded-full bg-indigo-500" />
      )}
    </Button>
  )
})

NotificationBadge.displayName = 'NotificationBadge'
