"use client"

import Link from "next/link"
import { ArrowRight, Menu } from "lucide-react"
import { useEffect, useState, type ReactElement } from "react"

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

const SCROLLED_THRESHOLD_PX = 16

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

function useScrolledNavbar(): boolean {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = (): void => {
      const nextIsScrolled = window.scrollY > SCROLLED_THRESHOLD_PX
      setIsScrolled((currentIsScrolled) =>
        currentIsScrolled === nextIsScrolled
          ? currentIsScrolled
          : nextIsScrolled
      )
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return isScrolled
}

export function LandingNavbar(): ReactElement {
  const isScrolled = useScrolledNavbar()

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-3 transition-all duration-300 sm:px-4">
      <header
        data-scrolled={isScrolled ? "true" : "false"}
        className={cn(
          "mx-auto max-w-7xl transition-all duration-300",
          isScrolled
            ? "mt-3 rounded-2xl border border-indigo-100/80 bg-background/92 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.4)] backdrop-blur-xl dark:border-indigo-900/60"
            : "mt-0 rounded-none border-b border-indigo-100/80 bg-background/82 backdrop-blur-md dark:border-indigo-900/40"
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6",
            isScrolled ? "py-3" : "py-4"
          )}
        >
          <Link href="/" className="inline-flex items-center">
            <BrandWordmark
              className={cn(
                "transition-all duration-300",
                isScrolled
                  ? "text-[1.55rem] sm:text-[1.75rem]"
                  : "text-[1.65rem] sm:text-[1.85rem]"
              )}
            />
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
              className={cn(
                "bg-gradient-brand text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30",
                isScrolled ? "h-10 px-4" : "h-11 px-5"
              )}
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
