"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import {
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Trash2,
  AlertTriangle,
  Shield,
  ExternalLink,
  Loader2,
  Clock,
  HardDrive,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DataSectionProps {
  className?: string
}

type ExportFormat = "csv" | "json"
type ExportDateRange = "all" | "year" | "month"

interface DataRetentionInfo {
  expenses: number
  reports: number
  attachments: number
  totalStorage: string
}

export function DataSection({ className }: DataSectionProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [exportDateRange, setExportDateRange] = useState<ExportDateRange>("all")
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const dataRetentionInfo: DataRetentionInfo = {
    expenses: 1247,
    reports: 36,
    attachments: 89,
    totalStorage: "2.4 GB",
  }

  const handleExport = async (format: ExportFormat): Promise<void> => {
    setIsLoading((prev) => ({ ...prev, [`export-${format}`]: true }))
    try {
      // Simulate API call and file generation
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create a mock download
      const blob = new Blob(["Mock data export"], { type: format === "csv" ? "text/csv" : "application/json" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `spendscope-export-${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Data export completed", {
        description: `Your data has been exported as ${format.toUpperCase()}`,
      })
    } catch {
      toast.error("Export failed", {
        description: "Please try again later",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, [`export-${format}`]: false }))
    }
  }

  const handleDeleteAccount = async (): Promise<void> => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm")
      return
    }

    setIsLoading((prev) => ({ ...prev, delete: true }))
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success("Account deletion requested", {
        description: "You will receive a confirmation email shortly",
      })
      setIsDeleteDialogOpen(false)
      setDeleteConfirmText("")
    } catch {
      toast.error("Failed to process deletion request")
    } finally {
      setIsLoading((prev) => ({ ...prev, delete: false }))
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data & Privacy
        </CardTitle>
        <CardDescription>Manage your data exports, retention, and privacy settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Export Data */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Export Your Data</h4>
          </div>
          <p className="text-sm text-muted-foreground pl-7">
            Download a copy of your data. This includes expenses, reports, settings, and attachments.
          </p>

          {/* Date Range Selector */}
          <div className="pl-7 space-y-3">
            <Label>Date Range</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all" as const, label: "All Time", icon: Database },
                { value: "year" as const, label: "Last Year", icon: Calendar },
                { value: "month" as const, label: "Last Month", icon: Clock },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={exportDateRange === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportDateRange(option.value)}
                >
                  <option.icon className="mr-2 h-4 w-4" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Export Format Options */}
          <div className="grid gap-3 pl-7 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={isLoading["export-csv"]}
              className={cn(
                "flex items-center justify-between rounded-lg border p-4 transition-all",
                "hover:bg-accent hover:border-accent-foreground/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-green-500/10 p-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Export as CSV</p>
                  <p className="text-xs text-muted-foreground">Best for spreadsheets</p>
                </div>
              </div>
              {isLoading["export-csv"] ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleExport("json")}
              disabled={isLoading["export-json"]}
              className={cn(
                "flex items-center justify-between rounded-lg border p-4 transition-all",
                "hover:bg-accent hover:border-accent-foreground/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-500/10 p-2">
                  <FileJson className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Export as JSON</p>
                  <p className="text-xs text-muted-foreground">Best for developers</p>
                </div>
              </div>
              {isLoading["export-json"] ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        <Separator />

        {/* Data Retention Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Data Storage</h4>
          </div>
          <div className="grid gap-4 pl-7 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">{dataRetentionInfo.expenses}</p>
              <p className="text-sm text-muted-foreground">Expenses</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">{dataRetentionInfo.reports}</p>
              <p className="text-sm text-muted-foreground">Reports</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">{dataRetentionInfo.attachments}</p>
              <p className="text-sm text-muted-foreground">Attachments</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-bold">{dataRetentionInfo.totalStorage}</p>
              <p className="text-sm text-muted-foreground">Total Storage</p>
            </div>
          </div>
          <Alert className="ml-7">
            <Clock className="h-4 w-4" />
            <AlertTitle>Data Retention</AlertTitle>
            <AlertDescription>
              Your data is retained for as long as your account is active. Deleted data is permanently
              removed from our servers within 30 days.
            </AlertDescription>
          </Alert>
        </div>

        <Separator />

        {/* Privacy Settings Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Privacy Settings</h4>
          </div>
          <Button variant="ghost" size="sm">
            Manage Privacy
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Delete Account - Danger Zone */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h4 className="font-medium">Danger Zone</h4>
          </div>
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 ml-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Delete Account
                    </DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove
                      your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Warning</AlertTitle>
                      <AlertDescription>
                        All your expenses, reports, and settings will be permanently deleted. This
                        includes any team data you own.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-delete">
                        Type <span className="font-bold">DELETE</span> to confirm
                      </Label>
                      <Input
                        id="confirm-delete"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE here"
                        className="border-destructive/50 focus-visible:ring-destructive"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDeleteDialogOpen(false)
                        setDeleteConfirmText("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== "DELETE" || isLoading["delete"]}
                    >
                      {isLoading["delete"] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Permanently Delete
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
