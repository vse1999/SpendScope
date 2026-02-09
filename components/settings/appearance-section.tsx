"use client"

import React, { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Palette, Monitor, Sun, Moon, Minimize2, Maximize2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface AppearanceSectionProps {
  className?: string
}

type Theme = "light" | "dark" | "system"
type Density = "compact" | "comfortable"
type AccentColor = "blue" | "green" | "purple" | "orange"

const ACCENT_COLORS: { value: AccentColor; label: string; class: string }[] = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
]

export function AppearanceSection({ className }: AppearanceSectionProps): React.JSX.Element {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [density, setDensity] = useState<Density>("comfortable")
  const [accentColor, setAccentColor] = useState<AccentColor>("blue")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = async (newTheme: Theme): Promise<void> => {
    setIsLoading(true)
    try {
      setTheme(newTheme)
      toast.success(`Theme changed to ${newTheme}`)
    } catch (error) {
      toast.error("Failed to change theme")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDensityChange = async (newDensity: Density): Promise<void> => {
    setIsLoading(true)
    try {
      setDensity(newDensity)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300))
      toast.success(`Interface density set to ${newDensity}`)
    } catch (error) {
      toast.error("Failed to update density")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccentChange = async (newAccent: AccentColor): Promise<void> => {
    setIsLoading(true)
    try {
      setAccentColor(newAccent)
      // Simulate API call for accent color
      await new Promise((resolve) => setTimeout(resolve, 300))
      toast.success(`Accent color changed to ${newAccent}`)
    } catch (error) {
      toast.error("Failed to change accent color")
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how SpendScope looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance
        </CardTitle>
        <CardDescription>Customize how SpendScope looks and feels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selector */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Theme</Label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => handleThemeChange("light")}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Sun className="h-5 w-5" />
              <span className="text-sm">Light</span>
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => handleThemeChange("dark")}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Moon className="h-5 w-5" />
              <span className="text-sm">Dark</span>
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => handleThemeChange("system")}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Monitor className="h-5 w-5" />
              <span className="text-sm">System</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Interface Density */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Interface Density</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={density === "compact" ? "default" : "outline"}
              onClick={() => handleDensityChange("compact")}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Minimize2 className="h-5 w-5" />
              <span className="text-sm">Compact</span>
              <span className="text-xs text-muted-foreground">More content on screen</span>
            </Button>
            <Button
              variant={density === "comfortable" ? "default" : "outline"}
              onClick={() => handleDensityChange("comfortable")}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Maximize2 className="h-5 w-5" />
              <span className="text-sm">Comfortable</span>
              <span className="text-xs text-muted-foreground">Easier to read and scan</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Accent Color */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Accent Color</Label>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleAccentChange(color.value)}
                disabled={isLoading}
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all hover:bg-accent",
                  accentColor === color.value
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted"
                )}
              >
                <span
                  className={cn(
                    "h-6 w-6 rounded-full ring-2 ring-offset-2",
                    color.class,
                    accentColor === color.value ? "ring-primary" : "ring-transparent"
                  )}
                />
                <span className="text-sm font-medium">{color.label}</span>
                {accentColor === color.value && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Preview Card */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Preview</Label>
          <div
            className={cn(
              "rounded-lg border bg-card p-6 shadow-sm transition-all",
              density === "compact" ? "space-y-3" : "space-y-4"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "rounded-full",
                  ACCENT_COLORS.find((c) => c.value === accentColor)?.class,
                  density === "compact" ? "h-10 w-10" : "h-12 w-12"
                )}
              />
              <div className="space-y-1">
                <p className={cn("font-medium", density === "compact" ? "text-sm" : "text-base")}>
                  Sample Card
                </p>
                <p className="text-sm text-muted-foreground">
                  Current theme: <span className="capitalize">{resolvedTheme}</span> • Density:{" "}
                  <span className="capitalize">{density}</span>
                </p>
              </div>
            </div>
            <div
              className={cn(
                "rounded-md bg-muted",
                density === "compact" ? "h-2" : "h-3"
              )}
            />
            <div
              className={cn(
                "rounded-md bg-muted",
                density === "compact" ? "h-2 w-3/4" : "h-3 w-3/4"
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
