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
  LogOut,
  Sparkles,
  Users,
} from "lucide-react"

import { signOut } from "next-auth/react"
import { UserRole } from "@prisma/client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/ui/theme-toggle"
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
  defaultOpen?: boolean
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
    href: "/dashboard/analytics",
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

function isAdminRole(userRole: string): boolean {
  return userRole === UserRole.ADMIN
}

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname.startsWith(href)
}

function filterNavigationByRole(items: NavItem[], userRole: string): NavItem[] {
  const isAdmin = isAdminRole(userRole)

  return items.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false
    }

    return true
  })
}

// =============================================================================
// Logo Component
// =============================================================================

function SidebarLogo() {
  const { state } = useSidebar()

  return (
    <Link
      href="/dashboard"
      className="flex items-center px-2 transition-opacity hover:opacity-80"
    >

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
  const filteredNavigation = filterNavigationByRole(navigationItems, userRole)
  const filteredSecondaryNavigation = filterNavigationByRole(secondaryNavigation, userRole)

  return (
    <SidebarContent className="gap-0 overflow-x-hidden">
      {/* Main Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3">Platform</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredNavigation.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="mx-4 w-auto opacity-50" />

      {/* Secondary Navigation */}
      <SidebarGroup>
        <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3">Management</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredSecondaryNavigation.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isRouteActive(pathname, item.href)}
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
    <div className="px-3 py-1.5">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-2",
            state === "collapsed" && "justify-center px-0"
          )}
        >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
          {company.name.charAt(0).toUpperCase()}
        </div>
        <span
          className={cn(
            "text-sm font-medium text-sidebar-foreground truncate transition-opacity duration-200",
            state === "collapsed" && "hidden"
          )}
        >
          {company.name}
        </span>
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
          <DropdownMenu modal={false}>
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
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
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
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
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
  children,
  defaultOpen = true
}: DashboardSidebarProps) {
  const company = user.company

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsible="icon"
          variant="sidebar"
          className="border-r border-sidebar-border hidden lg:flex overflow-hidden"
        >
          <SidebarHeaderSection />
          <NavigationGroups userRole={user.role} />
          <CompanySection company={company} />
          <UserMenu user={user} />
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex-1 bg-background">
          {/* Mobile Header */}
          <div className="flex h-16 items-center justify-between border-b border-border/70 bg-background px-4 lg:hidden">
            <div className="flex items-center">
              <SidebarTrigger className="-ml-1" />
              <span className="ml-3 font-semibold">SpendScope</span>
            </div>
            <ThemeToggle />
          </div>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

// =============================================================================
// Exports
// =============================================================================

export type { NavItem }
