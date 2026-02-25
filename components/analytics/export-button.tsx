"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, Image as ImageIcon, Loader2 } from "lucide-react"
import type { AnalyticsData, MonthlyTrend, CategoryDistribution } from "@/types/analytics"

interface ExportButtonProps {
  data: AnalyticsData
  filename?: string
}

export function ExportButton({ data, filename = "analytics" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = () => {
    setIsExporting(true)
    
    // Convert data to CSV
    const headers = ["Metric", "Value"]
    const rows = [
      ["Total Amount", data.summary?.totalAmount || 0],
      ["Total Expenses", data.summary?.totalCount || 0],
      ["Average Expense", data.summary?.averageExpense || 0],
      ["Period Start", data.summary?.startDate || ""],
      ["Period End", data.summary?.endDate || ""],
    ]

    // Add monthly data
    if (data.monthlyTrend) {
      rows.push([])
      rows.push(["Monthly Breakdown", ""])
      data.monthlyTrend.forEach((month: MonthlyTrend) => {
        rows.push([month.month, month.amount])
      })
    }

    // Add category data
    if (data.categoryDistribution) {
      rows.push([])
      rows.push(["Category Breakdown", ""])
      data.categoryDistribution.forEach((cat: CategoryDistribution) => {
        rows.push([cat.name, cat.amount])
      })
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n")

    // Download
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    setIsExporting(false)
  }

  const exportToPNG = async () => {
    setIsExporting(true)
    
    // Find the analytics container
    const container = document.getElementById("analytics-container")
    if (!container) {
      setIsExporting(false)
      return
    }

    // Use html2canvas-like approach (simplified - in production use actual library)
    // For now, alert user that this would capture the charts
    alert("PNG export would capture the charts as image. Install html2canvas for full implementation.")
    
    setIsExporting(false)
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPNG}>
          <ImageIcon className="mr-2 h-4 w-4" />
          Export as PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
