"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditCard, LogOut, Settings, Sparkles, X } from "lucide-react"
import { signOut } from "next-auth/react"
import { UserRole } from "@prisma/client"

import {
  DASHBOARD_PRIMARY_NAV_ITEMS,
  DASHBOARD_SECONDARY_NAV_ITEMS,
  filterDashboardNavigationByRole,
  getDashboardPageTitle,
  isDashboardRouteActive,
  type DashboardNavItem,
} from "@/components/dashboard/navigation-config"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SheetClose } from "@/components/ui/sheet"
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
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from "@/lib/utils"

interface DashboardSidebarUser {
  readonly id: string
  readonly name?: string | null
  readonly email?: string | null
  readonly image?: string | null
  readonly role: UserRole
  readonly company?: {
    readonly id: string
    readonly name: string
  } | null
}

interface DashboardSidebarProps {
  readonly user: DashboardSidebarUser
  readonly children: React.ReactNode
  readonly defaultOpen?: boolean
}

function getUserInitials(name: string | null | undefined): string {
  if (!name) {
    return "U"
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function SidebarLogo(): React.JSX.Element {
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

function NavItemButton({
  item,
  isActive,
  mobile = false,
}: {
  readonly item: DashboardNavItem
  readonly isActive: boolean
  readonly mobile?: boolean
}): React.JSX.Element {
  const Icon = item.icon
  const { isMobile, setOpenMobile } = useSidebar()

  function handleSelect(): void {
    if (mobile && isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        size={mobile ? "lg" : "default"}
        tooltip={mobile ? undefined : item.title}
        className={cn(
          "relative group",
          mobile && "h-11 rounded-xl px-3 text-sm font-medium"
        )}
      >
        <Link href={item.href} onClick={handleSelect}>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.title}</span>
          {item.proOnly && (
            <Badge
              variant="secondary"
              className={cn(
                "ml-auto shrink-0 border-0 bg-linear-gradient-to-r from-amber-500/20 to-orange-500/20 text-[10px] font-medium text-amber-600",
                !mobile && "hidden group-data-[state=expanded]:inline-flex"
              )}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              PRO
            </Badge>
          )}
          {item.badge && (
            <Badge
              variant="secondary"
              className={cn(
                "ml-auto shrink-0 text-[10px] font-medium",
                !mobile && "hidden group-data-[state=expanded]:inline-flex"
              )}
            >
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavigationGroups({
  userRole,
  mobile = false,
}: {
  readonly userRole: UserRole
  readonly mobile?: boolean
}): React.JSX.Element {
  const pathname = usePathname()
  const filteredNavigation = filterDashboardNavigationByRole(
    DASHBOARD_PRIMARY_NAV_ITEMS,
    userRole
  )
  const filteredSecondaryNavigation = filterDashboardNavigationByRole(
    DASHBOARD_SECONDARY_NAV_ITEMS,
    userRole
  )

  return (
    <SidebarContent
      className={cn(
        "gap-0 overflow-x-hidden",
        mobile && "gap-4 px-1 pb-4"
      )}
    >
      <SidebarGroup className={cn(mobile && "p-0")}>
        <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Platform
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className={cn(mobile && "gap-1.5")}>
            {filteredNavigation.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isDashboardRouteActive(pathname, item.href)}
                mobile={mobile}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className={cn("mx-4 w-auto opacity-50", mobile && "mx-3")} />

      <SidebarGroup className={cn(mobile && "p-0")}>
        <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Management
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className={cn(mobile && "gap-1.5")}>
            {filteredSecondaryNavigation.map((item) => (
              <NavItemButton
                key={item.href}
                item={item}
                isActive={isDashboardRouteActive(pathname, item.href)}
                mobile={mobile}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}

function CompanySection({
  company,
}: {
  readonly company?: DashboardSidebarUser["company"]
}): React.JSX.Element | null {
  const { state } = useSidebar()

  if (!company) {
    return null
  }

  return (
    <div className="px-3 py-1.5">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2 py-2",
          state === "collapsed" && "justify-center px-0"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {company.name.charAt(0).toUpperCase()}
        </div>
        <span
          className={cn(
            "truncate text-sm font-medium text-sidebar-foreground transition-opacity duration-200",
            state === "collapsed" && "hidden"
          )}
        >
          {company.name}
        </span>
      </div>
    </div>
  )
}

function DesktopUserMenu({
  user,
}: {
  readonly user: DashboardSidebarUser
}): React.JSX.Element {
  const { state } = useSidebar()
  const initials = getUserInitials(user.name)

  function handleSignOut(): void {
    void signOut({ callbackUrl: "/" })
  }

  return (
    <SidebarFooter className="gap-2">
      <SidebarSeparator className="mx-2 w-auto" />

      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild id="dashboard-sidebar-user-menu-trigger">
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                tooltip={user.name || "User menu"}
              >
                <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                  <AvatarImage
                    src={user.image || undefined}
                    alt={user.name || "User avatar"}
                    className="rounded-lg"
                  />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-medium text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "grid flex-1 text-left text-sm leading-tight transition-opacity duration-200",
                    state === "collapsed" && "hidden"
                  )}
                >
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {user.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="min-w-56 w-[--radix-popper-anchor-width]"
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
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-medium text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                    <span className="truncate text-[10px] uppercase text-muted-foreground/70">
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
                className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50"
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

function SidebarHeaderSection(): React.JSX.Element {
  return (
    <SidebarHeader className="h-16 border-b border-sidebar-border">
      <div className="flex h-full items-center px-2">
        <SidebarLogo />
      </div>
    </SidebarHeader>
  )
}

function MobileSidebarHeader({
  company,
}: {
  readonly company?: DashboardSidebarUser["company"]
}): React.JSX.Element {
  return (
    <SidebarHeader className="gap-2 border-b border-sidebar-border px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <SheetClose asChild>
            <Link
              href="/dashboard"
              className="truncate text-base font-semibold tracking-tight text-sidebar-foreground"
            >
              SpendScope
            </Link>
          </SheetClose>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {company?.name || "Dashboard navigation"}
          </p>
        </div>
        <SheetClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetClose>
      </div>
    </SidebarHeader>
  )
}

function MobileCompanySection({
  company,
}: {
  readonly company?: DashboardSidebarUser["company"]
}): React.JSX.Element | null {
  if (!company) {
    return null
  }

  return (
    <div className="px-3 py-3">
      <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            {company.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {company.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              Workspace
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileAccountSection({
  user,
}: {
  readonly user: DashboardSidebarUser
}): React.JSX.Element {
  const initials = getUserInitials(user.name)
  const { setOpenMobile } = useSidebar()

  function handleSignOut(): void {
    setOpenMobile(false)
    void signOut({ callbackUrl: "/" })
  }

  return (
    <SidebarFooter className="gap-3 border-t border-sidebar-border px-3 py-4">
      <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0 rounded-xl">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || "User avatar"}
              className="rounded-xl"
            />
            <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {user.name || "User"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
            {user.role}
          </Badge>
        </div>
      </div>

      <Button
        variant="ghost"
        className="h-11 w-full justify-start rounded-xl px-3 text-red-600 hover:bg-red-500/10 hover:text-red-600"
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </SidebarFooter>
  )
}

function MobileSidebarContent({
  user,
}: {
  readonly user: DashboardSidebarUser
}): React.JSX.Element {
  return (
    <>
      <MobileSidebarHeader company={user.company} />
      <MobileCompanySection company={user.company} />
      <NavigationGroups userRole={user.role} mobile />
      <MobileAccountSection user={user} />
    </>
  )
}

function MobileTopBar(): React.JSX.Element {
  const pathname = usePathname()
  const pageTitle = getDashboardPageTitle(pathname)

  return (
    <div className="flex h-16 items-center justify-between border-b border-border/70 bg-background px-4 lg:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {pageTitle}
          </p>
          <p className="truncate text-xs text-muted-foreground">SpendScope</p>
        </div>
      </div>
      <ThemeToggle />
    </div>
  )
}

function DashboardSidebarShell({
  user,
  children,
}: {
  readonly user: DashboardSidebarUser
  readonly children: React.ReactNode
}): React.JSX.Element {
  const { isMobile } = useSidebar()

  return (
    <div className="flex min-h-screen w-full min-w-0">
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        className="overflow-hidden"
      >
        {isMobile ? (
          <MobileSidebarContent user={user} />
        ) : (
          <>
            <SidebarHeaderSection />
            <NavigationGroups userRole={user.role} />
            <CompanySection company={user.company} />
            <DesktopUserMenu user={user} />
          </>
        )}
      </Sidebar>

      <SidebarInset className="min-w-0 flex-1 bg-background">
        <MobileTopBar />
        {children}
      </SidebarInset>
    </div>
  )
}

export function DashboardSidebar({
  user,
  children,
  defaultOpen = true,
}: DashboardSidebarProps): React.JSX.Element {
  return (
    <SidebarProvider defaultOpen={defaultOpen} mobileBreakpoint={1024}>
      <DashboardSidebarShell user={user}>{children}</DashboardSidebarShell>
    </SidebarProvider>
  )
}
