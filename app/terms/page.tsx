import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the SpendScope terms that govern access to the platform.",
}

export default function TermsPage(): React.JSX.Element {
  return (
    <main className="min-h-screen app-shell px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Legal
          </p>
          <h1 className="app-page-title text-4xl">Terms of Service</h1>
          <p className="text-base text-muted-foreground">
            These terms describe the conditions for evaluating and using SpendScope.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Evaluation access</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            SpendScope is presented as a portfolio-grade product demo and may be updated,
            rate-limited, or reset without notice while the platform is under active
            development.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Acceptable use</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            You may not misuse the service, attempt unauthorized access, interfere with
            other users, or upload data that you do not have the right to process.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Service availability</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            The application is provided on an as-available basis. Features, billing
            behavior, and integrations may change as the product evolves toward production
            readiness.
          </p>
        </section>
      </div>
    </main>
  )
}
