"use client"

import { useState } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ANALYTICS_DAY_PRESET_OPTIONS } from "@/lib/analytics/date-range"

interface DateRangePickerProps {
  value: number
  onChange: (days: number) => void
  disabled?: boolean
}

export function DateRangePicker({
  value,
  onChange,
  disabled = false,
}: DateRangePickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const selectedLabel =
    ANALYTICS_DAY_PRESET_OPTIONS.find((preset) => preset.value === value)?.label ?? "Custom"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={disabled}>
          <CalendarDays className="h-4 w-4" />
          {selectedLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        {ANALYTICS_DAY_PRESET_OPTIONS.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => {
              if (disabled || preset.value === value) {
                setOpen(false)
                return
              }
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
