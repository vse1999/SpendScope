import ExpenseForm from "@/components/expense-form"

interface PageHeaderProps {
  userName?: string
  companyId?: string
  userId?: string
}

export function PageHeader({ userName, companyId, userId }: PageHeaderProps) {
  const firstName = userName?.split(" ")[0] || "there"

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {firstName}! Here&apos;s your spending overview.
        </p>
      </div>
      {userId && companyId && (
        <ExpenseForm />
      )}
    </div>
  )
}
