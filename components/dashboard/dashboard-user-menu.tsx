"use client"

import Link from "next/link"
import { UserRole } from "@prisma/client"
import { CreditCard, Loader2, LogOut, Settings, Users } from "lucide-react"
import { signOut } from "next-auth/react"
import React from "react"

import { getInitials, formatRole, ROLE_BADGE_VARIANTS } from "@/components/dashboard/header-utils"
import type { DashboardHeaderUser } from "@/components/dashboard/header-types"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardUserMenuProps {
  user: DashboardHeaderUser
}

export function DashboardUserMenu({
  user,
}: DashboardUserMenuProps): React.JSX.Element {
  const initials = getInitials(user.name)
  const displayName = user.name || user.email || "User"
  const displayEmail = user.email || ""
  const roleLabel = formatRole(user.role)
  const roleBadgeVariant = ROLE_BADGE_VARIANTS[user.role] || "outline"
  const [isSigningOut, setIsSigningOut] = React.useState(false)
  const isAdmin = user.role === UserRole.ADMIN

  const handleSignOut = async (): Promise<void> => {
    if (isSigningOut) {
      return
    }

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
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild id="dashboard-header-user-menu-trigger">
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full p-0"
          aria-label="User menu"
        >
          <Avatar size="sm">
            <AvatarImage src={user.image || undefined} alt={displayName} />
            <AvatarFallback className="text-[11px] font-medium">
              {initials}
            </AvatarFallback>
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
              <Badge variant={roleBadgeVariant} className="h-5 text-[10px]">
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
