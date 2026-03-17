import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { ReactElement } from "react"

import type { BreadcrumbItem } from "@/components/dashboard/header-types"

interface DashboardBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[]
}

export function DashboardBreadcrumbs({
  breadcrumbs,
}: DashboardBreadcrumbsProps): ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
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
  )
}
