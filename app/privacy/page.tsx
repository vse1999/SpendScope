import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Review how SpendScope handles account and usage data.",
}

export default function PrivacyPage(): React.JSX.Element {
  return (
    <main className="min-h-screen app-shell px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Legal
          </p>
          <h1 className="app-page-title text-4xl">Privacy Policy</h1>
          <p className="text-base text-muted-foreground">
            This policy explains what information SpendScope stores and why it is needed.
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Information collected</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            SpendScope stores the account data required to authenticate users, associate
            them with companies, and support expense, billing, and notification workflows.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">How information is used</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            The platform uses this data to render dashboards, authorize access, send
            in-product notifications, and operate billing or team-management flows when
            enabled.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Data handling</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            SpendScope is developed with a least-privilege mindset. Sensitive data is not
            intentionally exposed in client bundles, logs are minimized, and deployment
            safeguards are applied as part of the production hardening process.
          </p>
        </section>
      </div>
    </main>
  )
}
