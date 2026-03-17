"use client"

import Link from "next/link"
import { ArrowRight, Menu } from "lucide-react"
import type { ReactElement } from "react"

import { MarketingScrollLink } from "@/components/marketing/marketing-scroll-link"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigationItems = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const

function BrandWordmark({ className }: { className?: string }): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold tracking-tight",
        "bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500",
        "bg-clip-text text-transparent",
        "transition-all duration-300 hover:opacity-90",
        className
      )}
    >
      SpendScope
    </span>
  )
}

export function LandingNavbar(): ReactElement {
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <header
        className={cn(
          "border-b border-indigo-100/80 bg-background/90 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-indigo-900/40"
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center">
            <BrandWordmark className="text-[1.65rem] sm:text-[1.85rem]" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {navigationItems.map((item) => (
              <MarketingScrollLink
                key={item.href}
                href={item.href}
                className="transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {item.label}
              </MarketingScrollLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              asChild
              className="h-11 bg-gradient-brand px-5 text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30"
            >
              <Link href="/signup">
                Start Free Plan
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-75 sm:w-100">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation menu</SheetTitle>
                  <SheetDescription>
                    Browse the landing page sections and authentication actions.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6 py-4">
                  <nav className="flex flex-col gap-4">
                    {navigationItems.map((item) => (
                      <SheetClose asChild key={item.href}>
                        <MarketingScrollLink
                          href={item.href}
                          className="text-lg font-medium text-foreground transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {item.label}
                        </MarketingScrollLink>
                      </SheetClose>
                    ))}
                  </nav>

                  <div className="h-px bg-border" />

                  <div className="flex flex-col gap-3">
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/login">Sign In</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="w-full bg-gradient-brand text-white shadow-md shadow-indigo-500/20">
                        <Link href="/signup">
                          Open Free Workspace
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </div>
  )
}
