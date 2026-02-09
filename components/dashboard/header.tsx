"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  AvatarBadge,
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
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import {
  ChevronRight,
  Home,
  Search,
  Bell,
  HelpCircle,
  FileText,
  Keyboard,
  LifeBuoy,
  Sparkles,
  User,
  Settings,
  CreditCard,
  LogOut,
  Check,
  Inbox,
  Command,
} from "lucide-react"

// ============================================================================
// Types & Interfaces
// ============================================================================

interface BreadcrumbItem {
  label: string
  href: string
  isLast: boolean
}

interface Notification {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  type: "info" | "success" | "warning" | "error"
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

// ============================================================================
// Utility Functions
// ============================================================================

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: "Home",
      href: "/dashboard",
      isLast: segments.length === 1 && segments[0] === "dashboard",
    },
  ]

  let currentPath = ""
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`

    if (segment === "dashboard" && index === 0) return

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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-fit gap-2 rounded-md bg-background px-2 text-muted-foreground shadow-none hover:bg-accent hover:text-accent-foreground md:w-40 lg:w-64"
        onClick={() => setIsOpen(true)}
        aria-label="Open search"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden md:inline-flex">Search...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 md:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search across your dashboard for expenses, categories, and more.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center border-b px-3">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Type a command or search..."
              className="flex h-12 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            <kbd className="hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-opacity-100 sm:inline-flex">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              <Command className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p>Search is coming soon!</p>
              <p className="text-xs text-muted-foreground/60">
                You&apos;ll be able to search expenses, categories, and more.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Type</span>
              <kbd className="rounded border bg-background px-1">↑↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Press</span>
              <kbd className="rounded border bg-background px-1">↵</kbd>
              <span>to select</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function HelpDropdown(): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Help menu"
        >
          <HelpCircle className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Help & Resources</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/docs">
              <FileText className="mr-2 size-4" />
              Documentation
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/shortcuts">
              <Keyboard className="mr-2 size-4" />
              Keyboard Shortcuts
              <DropdownMenuShortcut>?</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/support">
              <LifeBuoy className="mr-2 size-4" />
              Support
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/whats-new">
              <Sparkles className="mr-2 size-4" />
              What&apos;s New
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationsDropdown(): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Welcome to SpendScope!",
      description: "Get started by adding your first expense.",
      time: "2 hours ago",
      read: false,
      type: "info",
    },
    {
      id: "2",
      title: "New team member joined",
      description: "John Doe has joined your team.",
      time: "1 day ago",
      read: false,
      type: "success",
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = (): void => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    )
  }

  const markAsRead = (id: string): void => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="px-0 py-0">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={markAllAsRead}
            >
              <Check className="mr-1 size-3" />
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
              <Inbox className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer items-start gap-3 px-3 py-3"
                onClick={() => markAsRead(notification.id)}
              >
                <div
                  className={cn(
                    "mt-0.5 size-2 rounded-full",
                    !notification.read && "bg-primary",
                    notification.read && "bg-transparent"
                  )}
                />
                <div className="flex-1 space-y-1">
                  <p
                    className={cn(
                      "text-sm",
                      !notification.read && "font-medium",
                      notification.read && "text-muted-foreground"
                    )}
                  >
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {notification.time}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu({ user }: { user: DashboardHeaderProps["user"] }): React.JSX.Element {
  const initials = getInitials(user.name)
  const displayName = user.name || user.email || "User"
  const displayEmail = user.email || ""
  const roleLabel = formatRole(user.role)
  const roleBadgeVariant = ROLE_BADGE_VARIANTS[user.role] || "outline"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 gap-2 px-2"
          aria-label="User menu"
        >
          <div className="relative">
            <Avatar size="sm">
              <AvatarImage
                src={user.image || undefined}
                alt={displayName}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <AvatarBadge className="size-2.5 bg-emerald-500 ring-2 ring-background" />
          </div>
          <div className="hidden flex-col items-start text-left lg:flex">
            <span className="text-sm font-medium leading-none">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {roleLabel}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayEmail}
            </p>
            <div className="pt-1">
              <Badge variant={roleBadgeVariant} className="text-[10px]">
                {roleLabel}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">
              <User className="mr-2 size-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings className="mr-2 size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/billing">
              <CreditCard className="mr-2 size-4" />
              Billing
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          asChild
        >
          <Link href="/api/auth/signout">
            <LogOut className="mr-2 size-4" />
            Sign out
          </Link>
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 lg:gap-4 lg:px-8">
      {/* Left Section: Search + Breadcrumbs */}
      <div className="flex flex-1 items-center gap-3 lg:gap-4">
        {/* Search Button - Hidden on smallest screens */}
        <div className="hidden sm:block">
          <SearchButton />
        </div>

        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center text-sm"
        >
          <ol className="flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                {crumb.isLast ? (
                  <span
                    className="truncate font-medium text-foreground"
                    aria-current="page"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className={cn(
                      "shrink-0 text-muted-foreground transition-colors hover:text-foreground",
                      index === 0 && "flex items-center gap-1"
                    )}
                  >
                    {index === 0 && <Home className="size-3.5" />}
                    <span className={cn(index === 0 && "sr-only")}>
                      {crumb.label}
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Company name - Hidden on mobile */}
        {user.company && (
          <>
            <span className="hidden max-w-[150px] truncate text-sm text-muted-foreground lg:block xl:max-w-[200px]">
              {user.company.name}
            </span>
            <Separator
              orientation="vertical"
              className="hidden h-6 lg:block"
            />
          </>
        )}

        {/* Help Dropdown */}
        <HelpDropdown />

        {/* Notifications */}
        <NotificationsDropdown />

        {/* Theme Toggle - Hidden on mobile */}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {/* User Menu */}
        <UserMenu user={user} />
      </div>
    </header>
  )
}
