"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Settings,
  CreditCard,
  Building2,
  LogOut,
  Wallet,
  Sparkles,
  Users,
} from "lucide-react"

import { signOut } from "next-auth/react"
import { UserRole } from "@prisma/client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


// =============================================================================
// Types
// =============================================================================

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
  proOnly?: boolean
  badge?: string
}

interface DashboardSidebarProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: string
    company?: {
      id: string
      name: string
    } | null
  }
  children: React.ReactNode
}

interface MobileSidebarProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: string
    company?: {
      id: string
      name: string
    } | null
  }
}

// =============================================================================
// Navigation Configuration
// =============================================================================

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Expenses",
    href: "/dashboard/expenses",
    icon: Receipt,
  },
  // {
  //   title: "Categories",
  //   href: "/dashboard/categories",
  //   icon: Tags,
  //   adminOnly: true,
  // },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Team",
    href: "/dashboard/team",
    icon: Users,
    adminOnly: true,
  },
]

const secondaryNavigation: NavItem[] = [
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
]

// =============================================================================
// Logo Component
// =============================================================================

function SidebarLogo() {
  const { state } = useSidebar()

  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 px-2 transition-opacity hover:opacity-80"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-gradient-to-br from-indigo-500 to-purple-600 text-white shrink-0">
        <Wallet className="h-5 w-5" />
      </div>
      <span
        className={cn(
          "text-lg font-semibold tracking-tight transition-opacity duration-200",
          state === "collapsed" && "opacity-0"
        )}
      >
        SpendScope
      </span>
    </Link>
  )
}

// =============================================================================
// Navigation Item Component
// =============================================================================

function NavItemButton({
  item,
  isActive,
}: {
  item: NavItem
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className="relative group"
      >
        <Link href={item.href}>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.title}</span>
          {item.proOnly && (
            <Badge
              variant="secondary"
              className="ml-auto shrink-0 bg-linear-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-0 text-[10px] font-medium hidden group-data-[state=expanded]:inline-flex"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              PRO
            </Badge>
          )}
          {item.badge && (
            <Badge
              variant="secondary"
              className="ml-auto shrink-0 text-[10px] font-medium hidden group-data-[state=expanded]:inline-flex"
            >
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// =============================================================================
// Navigation Groups Component
// =============================================================================

function NavigationGroups({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const isAdmin = userRole === UserRole.ADMIN

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const filteredNavigation = navigationItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false
    }
    return true
  })

  return (
    <SidebarContent className="gap-0">
      {/* Main Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredNavigation.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="mx-4 w-auto" />

      {/* Secondary Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel>Management</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {secondaryNavigation.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}

// =============================================================================
// Company Section Component
// =============================================================================

function CompanySection({ company }: { company?: { name: string } | null }) {
  const { state } = useSidebar()

  if (!company) return null

  return (
    <div className="px-3 py-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-2",
          state === "collapsed" && "justify-center px-2"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Building2 className="h-4 w-4" />
        </div>
        <div
          className={cn(
            "flex-1 min-w-0 transition-opacity duration-200",
            state === "collapsed" && "hidden"
          )}
        >
          <p className="text-xs font-medium text-sidebar-foreground/70 truncate">
            {company.name}
          </p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate">
            Organization
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// User Menu Component
// =============================================================================

function UserMenu({ 
  user 
}: { 
  user: { 
    name?: string | null
    email?: string | null
    image?: string | null
    role: string
  } 
}) {
  const { state } = useSidebar()
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <SidebarFooter className="gap-2">
      <SidebarSeparator className="mx-2 w-auto" />
      
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                tooltip={user.name || "User menu"}
              >
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarImage
                    src={user.image || undefined}
                    alt={user.name || "User avatar"}
                    className="rounded-lg"
                  />
                  <AvatarFallback className="rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "grid flex-1 text-left text-sm leading-tight transition-opacity duration-200",
                    state === "collapsed" && "hidden"
                  )}
                >
                  <span className="truncate font-semibold">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {user.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="w-[--radix-popper-anchor-width] min-w-56"
              align="end"
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user.image || undefined}
                      alt={user.name || "User avatar"}
                      className="rounded-lg"
                    />
                    <AvatarFallback className="rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground/70 uppercase">
                      {user.role}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}

// =============================================================================
// Sidebar Header with Trigger
// =============================================================================

function SidebarHeaderSection() {
  return (
    <SidebarHeader className="h-16 border-b border-sidebar-border">
      <div className="flex h-full items-center px-2">
        <SidebarLogo />
      </div>
    </SidebarHeader>
  )
}

// =============================================================================
// Main Desktop Sidebar Component
// =============================================================================

export function DashboardSidebar({ 
  user, 
  children 
}: DashboardSidebarProps) {
  const company = user.company

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsible="icon"
          variant="sidebar"
          className="border-r border-sidebar-border hidden lg:flex"
        >
          <SidebarHeaderSection />
          <NavigationGroups userRole={user.role} />
          <SidebarRail />
          <CompanySection company={company} />
          <UserMenu user={user} />
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex-1 bg-slate-50 dark:bg-slate-950">
          {/* Mobile Header */}
          <div className="flex h-16 items-center border-b bg-white dark:bg-slate-950 px-4 lg:hidden">
            <SidebarTrigger className="-ml-1" />
            <span className="ml-3 font-semibold">SpendScope</span>
          </div>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

// =============================================================================
// Mobile Sidebar Component
// =============================================================================

export function MobileSidebar({ user }: MobileSidebarProps) {
  const company = user.company
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const isAdmin = user.role === UserRole.ADMIN

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const filteredNavigation = navigationItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false
    }
    return true
  })

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={() => setOpenMobile(false)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            SpendScope
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <div className="px-3">
          <p className="mb-2 px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
            Platform
          </p>
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenMobile(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  {item.proOnly && (
                    <Badge
                      variant="secondary"
                      className="bg-linear-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-0 text-[10px] font-medium"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      PRO
                    </Badge>
                  )}
                  {item.badge && (
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        <Separator className="my-4 bg-sidebar-border" />

        <div className="px-3">
          <p className="mb-2 px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
            Management
          </p>
          <div className="space-y-1">
            {secondaryNavigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenMobile(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        {company && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-3 w-3" />
            </div>
            <span className="text-xs font-medium text-sidebar-foreground/70 truncate">
              {company.name}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarImage src={user.image || undefined} alt={user.name || "User"} className="rounded-lg" />
            <AvatarFallback className="rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export type { NavItem }
