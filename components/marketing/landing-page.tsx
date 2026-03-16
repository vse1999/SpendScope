import type { ReactElement } from "react";

import { LandingNavbar } from "@/components/marketing/landing-navbar";
import {
  CTASection,
  FAQSection,
  FeaturesSection,
  HeroSection,
  PricingSection,
  TechStackSection,
  TourSection,
} from "@/components/marketing/sections";
import { MARKETING_ANALYTICS_DATA } from "@/lib/marketing/demo-data";
import { PRICING_PLANS } from "@/lib/marketing/pricing-plans";

const trustItems = [
  { title: "Role-based access controls", iconName: "ShieldCheck" },
  { title: "Audit history for key changes", iconName: "Layers3" },
  { title: "Secure OAuth authentication", iconName: "LockKeyhole" },
  { title: "Team invitations and admin workflows", iconName: "Users" },
] as const;

const technologies = [
  {
    name: "Next.js",
    logoPath: "/logos/Next.js_Logo_0.svg",
    logoAlt: "Next.js logo",
    colorModeClassName: "invert",
  },
  {
    name: "Neon",
    logoPath: "/logos/neon-logo-dark-color.svg",
    logoAlt: "Neon logo",
  },
  {
    name: "Stripe",
    logoPath: "/logos/Powered%20by%20Stripe%20-%20black.svg",
    logoAlt: "Stripe logo",
    colorModeClassName: "invert",
  },
  {
    name: "Vercel",
    logoPath: "/logos/vercel-logotype-dark.svg",
    logoAlt: "Vercel logo",
  },
] as const;

const tourSteps = [
  {
    title: "Capture expenses fast",
    description:
      "Submit spending records with categories and context in a workflow teams can adopt immediately.",
    detail: "From first entry to organized ledger in minutes.",
  },
  {
    title: "Apply policy guidance and risk checks",
    description:
      "Use expense monitor alerts and budget-aware policies to spot risk patterns before they grow into surprises.",
    detail: "Prevent drift with explainable decision support.",
  },
  {
    title: "Review trends and act with team controls",
    description:
      "Monitor analytics, manage member roles, and keep operations aligned with clear ownership.",
    detail: "Move from raw spend data to actionable priorities.",
  },
] as const;

const faqItems = [
  {
    question: "Who is SpendScope for?",
    answer:
      "SpendScope is designed for startups, growing companies, and enterprise teams that need clear expense visibility and stronger spending control.",
  },
  {
    question: "Can I start without payment details?",
    answer:
      "Yes. Free tier onboarding does not require a credit card, so teams can validate the workflow before upgrading.",
  },
  {
    question: "How does team access work?",
    answer:
      "You can invite team members, assign roles, and manage admin permissions to keep ownership and approvals structured.",
  },
  {
    question: "Does SpendScope support policy-aware controls?",
    answer:
      "Yes. The platform includes budget policy checks and expense monitor alerts to help teams catch risky spend patterns early.",
  },
] as const;

function Footer(): ReactElement {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-slate-50/50 py-8 dark:bg-slate-950/50">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-4 px-4 text-sm text-muted-foreground sm:px-6">
        <p className="text-xs font-medium">(c) {currentYear} SpendScope</p>
        <p className="text-xs">
          Built with modern technology for modern finance teams.
        </p>
      </div>
    </footer>
  );
}

export function LandingPage(): ReactElement {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <LandingNavbar />

      <div aria-hidden="true" className="h-20 sm:h-24" />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <HeroSection
          trustItems={trustItems}
          previewData={{
            monthlyTrend: MARKETING_ANALYTICS_DATA.monthlyTrend,
            summary: MARKETING_ANALYTICS_DATA.summary,
            userSpending: MARKETING_ANALYTICS_DATA.userSpending,
          }}
        />
        <TechStackSection technologies={technologies} />
        <FeaturesSection analyticsData={MARKETING_ANALYTICS_DATA} />
        <TourSection tourSteps={tourSteps} />
        <PricingSection plans={PRICING_PLANS} />
        <FAQSection faqItems={faqItems} />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
