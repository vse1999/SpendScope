"use client"

import Link from "next/link"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"

import { QUICK_ACTIONS } from "@/components/dashboard/header-utils"
import type { QuickAction } from "@/components/dashboard/header-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function QuickActionsButton(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault()
      setIsOpen((previousIsOpen) => !previousIsOpen)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const filteredActions = useMemo((): QuickAction[] => {
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
        className="h-8 gap-2 rounded-md px-2 text-muted-foreground/60 transition-colors hover:bg-accent/50 hover:text-foreground md:w-56 lg:w-64"
        onClick={() => setIsOpen(true)}
        aria-label="Open quick actions"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="hidden text-xs md:inline-flex">Quick actions...</span>
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
            <label htmlFor="dashboard-quick-actions-search" className="sr-only">
              Search dashboard pages
            </label>
            <input
              id="dashboard-quick-actions-search"
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
                <p className="text-xs text-muted-foreground/70">
                  Try another keyword.
                </p>
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
              <kbd className="rounded border bg-background px-1">Tab</kbd>
              <span>to move between pages</span>
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
