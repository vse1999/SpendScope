import { Building2 } from "lucide-react"

interface CompanyWelcomeProps {
  userName?: string | null
}

export function CompanyWelcome({ userName }: CompanyWelcomeProps) {
  const firstName = userName?.split(" ")[0] || "there"

  return (
    <section className="text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
        <Building2 className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight">Set up your spend workspace</h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Hi {firstName}! Join the workspace your team already uses, or create one for finance and operations to manage expenses, access, and billing in one place.
      </p>
    </section>
  )
}
