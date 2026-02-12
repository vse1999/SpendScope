"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import React, { useState, useEffect, useCallback } from "react"
import { UserRole } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BarChart3,
  ChevronRight,
  Search,
  Bell,
  Users,
  Settings,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Check,
  Inbox,
  X,
  Loader2,
} from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"

// ============================================================================
// Types & Interfaces
// ============================================================================

interface BreadcrumbItem {
  label: string
  href: string
  isLast: boolean
}

interface QuickAction {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
}

interface DashboardHeaderProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: UserRole
    company?: {
      id: string
      name: string
    } | null
  }
}

// ============================================================================
// Constants & Configuration
// ============================================================================

const breadcrumbNames: Record<string, string> = {
  dashboard: "Dashboard",
  expenses: "Expenses",
  categories: "Categories",
  analytics: "Analytics",
  team: "Team Members",
  billing: "Billing",
  settings: "Settings",
  profile: "Profile",
}

const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
}

const ROLE_BADGE_VARIANTS: Record<UserRole, "default" | "secondary" | "outline" | "destructive"> = {
  ADMIN: "default",
  MEMBER: "secondary",
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["home", "overview", "dashboard"],
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: CreditCard,
    keywords: ["expenses", "costs", "transactions"],
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    keywords: ["analytics", "reports", "insights"],
  },
  {
    label: "Account Settings",
    href: "/dashboard/settings",
    icon: Settings,
    keywords: ["profile", "account", "user", "settings"],
  },
  {
    label: "Team",
    href: "/dashboard/team",
    icon: Users,
    keywords: ["team", "members", "collaboration"],
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    keywords: ["billing", "subscription", "payment"],
  },
]

// ============================================================================
// Utility Functions
// ============================================================================

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  let currentPath = ""
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`

    // Skip "dashboard" as first segment — it's implicit
    if (segment === "dashboard" && index === 0) {
      breadcrumbs.push({
        label: "Dashboard",
        href: "/dashboard",
        isLast: segments.length === 1,
      })
      return
    }

    const isLast = index === segments.length - 1
    const label =
      breadcrumbNames[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1)

    breadcrumbs.push({
      label,
      href: currentPath,
      isLast,
    })
  })

  return breadcrumbs
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatRole(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role
}

// ============================================================================
// Sub-Components
// ============================================================================

function SearchButton(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const filteredActions = React.useMemo((): QuickAction[] => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return QUICK_ACTIONS
    }

    return QUICK_ACTIONS.filter((action) => {
      if (action.label.toLowerCase().includes(normalizedQuery)) {
        return true
      }

      return action.keywords.some((keyword) => keyword.includes(normalizedQuery))
    })
  }, [query])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-2 rounded-md px-2 text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-colors md:w-56 lg:w-64"
        onClick={() => setIsOpen(true)}
        aria-label="Open quick actions"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="hidden md:inline-flex text-xs">Quick actions...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/50 md:inline-flex">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) {
            setQuery("")
          }
        }}
      >
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Quick actions</DialogTitle>
            <DialogDescription>
              Search and jump to common dashboard pages.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center border-b px-3">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type to filter pages..."
              className="flex h-12 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            <kbd className="hidden h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
              Esc
            </kbd>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredActions.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                <p>No matching actions.</p>
                <p className="text-xs text-muted-foreground/70">Try another keyword.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredActions.map((action) => {
                  const ActionIcon = action.icon
                  return (
                    <li key={action.href}>
                      <Link
                        href={action.href}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setIsOpen(false)}
                      >
                        <ActionIcon className="size-4 text-muted-foreground" />
                        <span>{action.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Press</span>
              <kbd className="rounded border bg-background px-1">↑↓</kbd>
              <span>to close</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Select with</span>
              <kbd className="rounded border bg-background px-1">↵</kbd>
              <span>to open</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function NotificationsButton(): React.JSX.Element {
  const { unreadCount } = useNotifications()
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground/60 hover:text-foreground hover:bg-accent/50"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-2 rounded-full bg-indigo-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <NotificationsPanel />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationsPanel(): React.JSX.Element {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()
  const [isMarkingAll, setIsMarkingAll] = React.useState(false)

  const handleMarkAllAsRead = async (): Promise<void> => {
    if (isMarkingAll) return
    setIsMarkingAll(true)
    try {
      await markAllAsRead()
    } finally {
      setIsMarkingAll(false)
    }
  }

  const sortedNotifications = React.useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1
      }
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }, [notifications])

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium">
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Check className="mr-1 size-3" />
            )}
            Mark all read
          </Button>
        )}
      </div>
      <DropdownMenuSeparator />
      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
            <Inbox className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground">You&apos;re all caught up!</p>
          </div>
        ) : (
          sortedNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onRemove={removeNotification}
            />
          ))
        )}
      </div>
    </>
  )
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: {
  notification: { id: string; title: string; message: string; read: boolean; createdAt: Date; type: 'info' | 'success' | 'warning' | 'error' }
  onMarkAsRead: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}): React.JSX.Element {
  const [isMarking, setIsMarking] = React.useState(false)
  const [isRemoving, setIsRemoving] = React.useState(false)

  const handleClick = async (): Promise<void> => {
    if (!notification.read && !isMarking) {
      setIsMarking(true)
      try {
        await onMarkAsRead(notification.id)
      } finally {
        setIsMarking(false)
      }
    }
  }

  const handleRemove = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (isRemoving) return
    setIsRemoving(true)
    try {
      await onRemove(notification.id)
    } finally {
      setIsRemoving(false)
    }
  }

  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <DropdownMenuItem
      className={cn(
        'group flex cursor-pointer items-start gap-3 px-3 py-3',
        !notification.read && 'bg-accent/30'
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          'mt-1.5 size-1.5 rounded-full shrink-0',
          !notification.read ? 'bg-indigo-500' : 'bg-transparent'
        )}
      />
      <div className="flex-1 space-y-1 min-w-0">
        <p className={cn('text-sm leading-tight truncate', !notification.read ? 'font-medium' : 'text-muted-foreground')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[11px] text-muted-foreground/50">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-70 transition-opacity hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        onClick={handleRemove}
        disabled={isRemoving}
        aria-label={`Remove notification: ${notification.title}`}
      >
        {isRemoving ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
      </Button>
    </DropdownMenuItem>
  )
}

function UserMenu({ user }: { user: DashboardHeaderProps["user"] }): React.JSX.Element {
  const initials = getInitials(user.name)
  const displayName = user.name || user.email || "User"
  const displayEmail = user.email || ""
  const roleLabel = formatRole(user.role)
  const roleBadgeVariant = ROLE_BADGE_VARIANTS[user.role] || "outline"
  const [isSigningOut, setIsSigningOut] = React.useState(false)
  const isAdmin = user.role === UserRole.ADMIN

  const handleSignOut = async (): Promise<void> => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      const result = await signOut({ redirect: false, callbackUrl: "/login" })
      if (result.url) {
        window.location.assign(result.url)
        return
      }
      window.location.assign("/login")
    } catch {
      setIsSigningOut(false)
      window.location.assign("/api/auth/signout")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full p-0"
          aria-label="User menu"
        >
          <Avatar size="sm">
            <AvatarImage
              src={user.image || undefined}
              alt={displayName}
            />
            <AvatarFallback className="text-[11px] font-medium">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1.5">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayEmail}
            </p>
            {user.company && (
              <p className="text-[11px] leading-none text-muted-foreground/80">
                {user.company.name}
              </p>
            )}
            <div className="pt-0.5">
              <Badge variant={roleBadgeVariant} className="text-[10px] h-5">
                {roleLabel}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings className="mr-2 size-4" />
              Account settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/billing">
              <CreditCard className="mr-2 size-4" />
              Billing
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/team">
                <Users className="mr-2 size-4" />
                Team management
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault()
            void handleSignOut()
          }}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 size-4" />
          )}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function DashboardHeader({ user }: DashboardHeaderProps): React.JSX.Element {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center border-b border-border/40 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 px-4 lg:flex lg:px-6">
      {/* Left Section: Breadcrumbs */}
      <div className="flex flex-1 items-center gap-1 min-w-0">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center text-sm"
        >
          <ol className="flex items-center gap-1">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
                )}
                {crumb.isLast ? (
                  <span
                    className="truncate text-sm font-medium text-foreground"
                    aria-current="page"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="shrink-0 text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-0.5">
        {/* Search */}
        <SearchButton />

        <Separator orientation="vertical" className="mx-1.5 h-4 hidden sm:block" />

        {/* Notifications */}
        <NotificationsButton />

        {/* Theme Toggle */}
        <div className="hidden sm:block">
          <ThemeToggle showLabel />
        </div>

        <Separator orientation="vertical" className="mx-1.5 h-4" />

        {/* User Avatar */}
        <UserMenu user={user} />
      </div>
    </header>
  )
}
