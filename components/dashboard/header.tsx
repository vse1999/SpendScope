"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserRole } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  ChevronRight,
  Home,
} from "lucide-react"

// Breadcrumb mapping for friendly names
const breadcrumbNames: Record<string, string> = {
  dashboard: "Dashboard",
  expenses: "Expenses",
  categories: "Categories",
  analytics: "Analytics",
  team: "Team Members",
  billing: "Billing",
  settings: "Settings",
}

interface BreadcrumbItem {
  label: string
  href: string
  isLast: boolean
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove empty segments and split
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
    
    // Skip the first "dashboard" segment as it's represented by "Home"
    if (segment === "dashboard" && index === 0) return

    const isLast = index === segments.length - 1
    const label = breadcrumbNames[segment] || 
      segment.charAt(0).toUpperCase() + segment.slice(1)

    breadcrumbs.push({
      label,
      href: currentPath,
      isLast,
    })
  })

  return breadcrumbs
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

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-30 hidden md:flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav 
        aria-label="Breadcrumb" 
        className="flex flex-1 items-center gap-2 text-sm"
      >
        <ol className="flex items-center gap-2">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.href} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
              {crumb.isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors",
                    index === 0 && "flex items-center gap-1"
                  )}
                >
                  {index === 0 && <Home className="size-3.5" />}
                  <span className={cn(index === 0 && "sr-only")}>{crumb.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Right side - Company name */}
      <div className="flex items-center gap-4">
        {user.company && (
          <>
            <span className="text-sm text-muted-foreground hidden lg:block">
              {user.company.name}
            </span>
            <Separator orientation="vertical" className="h-6 hidden lg:block" />
          </>
        )}
        <span className="text-sm text-muted-foreground">
          {user.role}
        </span>
      </div>
    </header>
  )
}
