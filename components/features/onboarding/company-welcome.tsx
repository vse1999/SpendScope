import { Building2 } from "lucide-react"

interface CompanyWelcomeProps {
  userName?: string | null
}

export function CompanyWelcome({ userName }: CompanyWelcomeProps) {
  const firstName = userName?.split(" ")[0] || "there"

  return (
    <section className="text-center space-y-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
        <Building2 className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance">Welcome to SpendScope</h1>
      <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Hi {firstName}! To get started with expense tracking, you need to join or create a company workspace.
      </p>
    </section>
  )
}
