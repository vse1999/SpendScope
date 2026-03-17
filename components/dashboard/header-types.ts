import type * as React from "react"
import type { UserRole } from "@prisma/client"

export interface BreadcrumbItem {
  label: string
  href: string
  isLast: boolean
}

export interface QuickAction {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
}

export interface DashboardHeaderUser {
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

export interface DashboardHeaderProps {
  user: DashboardHeaderUser
}
