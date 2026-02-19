"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PieChart, Settings2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format-utils"
import { upsertCompanyBudget } from "@/app/actions/budget"
import {
  BUDGET_EXHAUSTION_POLICY,
  type BudgetExhaustionPolicy,
  type BudgetSummary,
  type CompanyBudgetSettings,
} from "@/lib/budget/types"

type BudgetCardUserRole = "ADMIN" | "MEMBER"

interface BudgetCardProps {
  summary: BudgetSummary
  settings: CompanyBudgetSettings | null
  currentUserRole: BudgetCardUserRole
}

function getUsageGradient(usagePercent: number): string {
  if (usagePercent >= 100) return "from-red-500 to-red-600"
  if (usagePercent >= 80) return "from-amber-500 to-amber-600"
  return "from-indigo-500 to-violet-600"
}

function getPolicyLabel(policy: BudgetExhaustionPolicy): string {
  switch (policy) {
    case BUDGET_EXHAUSTION_POLICY.BLOCK_ALL:
      return "Block all new expenses at budget limit"
    case BUDGET_EXHAUSTION_POLICY.BLOCK_NON_ADMIN:
      return "Block members, allow admins over budget"
    default:
      return "Warn only (allow over-budget expenses)"
  }
}

export function BudgetCard({ summary, settings, currentUserRole }: BudgetCardProps): React.JSX.Element {
  const router = useRouter()
  const isAdmin = currentUserRole === "ADMIN"

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [monthlyBudget, setMonthlyBudget] = useState<string>(
    settings ? settings.monthlyBudget.toFixed(2) : "10000"
  )
  const [currency, setCurrency] = useState<string>(settings?.currency ?? "USD")
  const [policy, setPolicy] = useState<BudgetExhaustionPolicy>(
    settings?.exhaustionPolicy ?? BUDGET_EXHAUSTION_POLICY.WARN_ONLY
  )
  const [isActive, setIsActive] = useState<boolean>(settings?.isActive ?? true)

  const usagePercent = summary.usagePercent ? Math.min(summary.usagePercent, 100) : 0

  const handleSave = async (): Promise<void> => {
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append("monthlyBudget", monthlyBudget)
      formData.append("currency", currency)
      formData.append("exhaustionPolicy", policy)
      formData.append("isActive", String(isActive))

      const result = await upsertCompanyBudget(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Budget settings updated")
      setIsDialogOpen(false)
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="app-card-strong relative overflow-hidden transition-all duration-200 hover:shadow-md group">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-brand" />
      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <div>
          <CardDescription className="text-sm font-semibold">
            Company Budget
          </CardDescription>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.hasBudget && summary.budgetAmount !== null
              ? `Monthly target: ${formatCurrency(summary.budgetAmount)}`
              : "No active monthly budget configured"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="mr-1 h-4 w-4" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Budget Settings</DialogTitle>
                  <DialogDescription>
                    Configure your monthly budget and enforcement policy for expense creation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyBudget">Monthly budget</Label>
                    <Input
                      id="monthlyBudget"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={monthlyBudget}
                      onChange={(event) => setMonthlyBudget(event.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={currency}
                      maxLength={3}
                      onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policy">Exhaustion policy</Label>
                    <Select
                      value={policy}
                      onValueChange={(value) => setPolicy(value as BudgetExhaustionPolicy)}
                      disabled={isSaving}
                    >
                      <SelectTrigger id="policy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={BUDGET_EXHAUSTION_POLICY.WARN_ONLY}>
                          Warn only
                        </SelectItem>
                        <SelectItem value={BUDGET_EXHAUSTION_POLICY.BLOCK_NON_ADMIN}>
                          Block non-admin over budget
                        </SelectItem>
                        <SelectItem value={BUDGET_EXHAUSTION_POLICY.BLOCK_ALL}>
                          Block all over budget
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Budget enforcement active</p>
                      <p className="text-xs text-muted-foreground">
                        Disable to keep budget informational only.
                      </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} disabled={isSaving} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <div className="app-icon-chip transition-transform duration-200 group-hover:scale-105">
            <PieChart className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {summary.hasBudget && summary.remaining !== null ? (
          <>
            <div className={cn("text-3xl font-bold tracking-tight", summary.remaining < 0 ? "text-destructive" : "text-foreground")}>
              {formatCurrency(summary.remaining)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Policy: {getPolicyLabel(summary.exhaustionPolicy)}
            </p>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Budget usage</span>
                <span className="text-xs font-semibold">
                  {(summary.usagePercent ?? 0).toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-linear-to-r transition-all duration-700 ease-out",
                    getUsageGradient(summary.usagePercent ?? 0)
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No active budget configured yet.
            </p>
            {isAdmin ? (
              <p className="text-xs text-muted-foreground">
                Use Configure to set monthly budget and over-budget policy.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ask an admin to configure a company budget.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
