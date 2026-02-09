import ExpenseForm from "@/components/expense-form"

interface PageHeaderProps {
  userName?: string
  companyId?: string
  userId?: string
}

export function PageHeader({ userName, companyId, userId }: PageHeaderProps) {
  const firstName = userName?.split(" ")[0] || "there"

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Welcome back, {firstName}. Here&apos;s your spending overview.
        </p>
      </div>
      {userId && companyId && (
        <ExpenseForm userId={userId} companyId={companyId} />
      )}
    </div>
  )
}
