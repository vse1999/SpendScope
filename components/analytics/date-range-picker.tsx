"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarDays, ChevronDown } from "lucide-react"

const PRESETS = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 180 days", value: 180 },
  { label: "Last 365 days", value: 365 },
] as const

interface DateRangePickerProps {
  value: number
  onChange: (days: number) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  
  const selectedLabel = PRESETS.find(p => p.value === value)?.label || "Custom"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          {selectedLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => {
              onChange(preset.value)
              setOpen(false)
            }}
            className={value === preset.value ? "bg-accent" : ""}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
