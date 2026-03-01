"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Check, ChevronDown, Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ThemeToggleProps {
  showLabel?: boolean
  className?: string
}

type ThemeOption = "light" | "dark" | "system"

function isThemeOption(theme: string | undefined): theme is ThemeOption {
  return theme === "light" || theme === "dark" || theme === "system"
}

function getThemeLabel(theme: ThemeOption): string {
  if (theme === "dark") return "Dark"
  if (theme === "system") return "System"
  return "Light"
}

function getThemeIcon(resolvedTheme: string | undefined): React.JSX.Element {
  if (resolvedTheme === "dark") {
    return <Moon className="h-4 w-4" />
  }
  return <Sun className="h-4 w-4" />
}

export function ThemeToggle({
  showLabel = false,
  className,
}: ThemeToggleProps): React.JSX.Element {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const activeTheme: ThemeOption = isThemeOption(theme) ? theme : "system"
  const activeThemeLabel = getThemeLabel(activeTheme)

  if (!hasMounted) {
    return (
      <Button
        variant="ghost"
        size={showLabel ? "sm" : "icon"}
        className={cn(
          showLabel ? "h-8 gap-1.5 px-2" : "h-9 w-9",
          className
        )}
      >
        <Sun className="h-4 w-4" />
        {showLabel && <span className="text-xs font-medium">Theme</span>}
        <span className="sr-only">Open theme menu</span>
      </Button>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild id="theme-toggle-trigger">
        <Button
          variant="ghost"
          size={showLabel ? "sm" : "icon"}
          className={cn(
            showLabel ? "h-8 gap-1.5 px-2 text-xs font-medium" : "h-9 w-9",
            className
          )}
          aria-label={`Theme: ${activeThemeLabel}. Open theme menu`}
        >
          {getThemeIcon(resolvedTheme)}
          {showLabel ? (
            <>
              <span>Theme</span>
              <span className="text-muted-foreground">{activeThemeLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </>
          ) : (
            <span className="sr-only">Open theme menu</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {activeTheme === "light" && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {activeTheme === "dark" && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {activeTheme === "system" && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
