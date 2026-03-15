import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import type { ReactElement } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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

const navigationItems = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

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

function BrandWordmark({ className }: { className?: string }): ReactElement {
  return (
    <span
      className={[
        "inline-flex items-center font-bold tracking-tight",
        "bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500",
        "bg-clip-text text-transparent",
        "transition-all duration-300 hover:opacity-90",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      SpendScope
    </span>
  );
}

function Header(): ReactElement {
  return (
    <header className="sticky top-0 z-50 border-b border-indigo-100/80 bg-background/80 backdrop-blur-md dark:border-indigo-900/40">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="inline-flex items-center">
          <BrandWordmark className="text-[1.65rem] sm:text-[1.85rem]" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-brand text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30"
          >
            <Link href="/signup">
              Start Free Plan
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-75 sm:w-100">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation menu</SheetTitle>
                <SheetDescription>
                  Browse the landing page sections and authentication actions.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-6 py-4">
                <nav className="flex flex-col gap-4">
                  {navigationItems.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="text-lg font-medium text-foreground transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <div className="h-px bg-border" />

                <div className="flex flex-col gap-3">
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild className="w-full bg-gradient-brand text-white shadow-md shadow-indigo-500/20">
                      <Link href="/signup">
                        Open Free Workspace
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

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
      <Header />

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
