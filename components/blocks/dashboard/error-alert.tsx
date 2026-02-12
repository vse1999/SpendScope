import { AlertCircle } from "lucide-react"

interface ErrorAlertProps {
  expensesError?: string
  statsError?: string
}

export function ErrorAlert({ expensesError, statsError }: ErrorAlertProps) {
  const errorMessage = expensesError || statsError || "Failed to load expense data"

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5" />
        <div>
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      </div>
    </div>
  )
}
