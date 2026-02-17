"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Menu,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { MagneticButton } from "@/components/marketing/animations";
import {
  HeroSection,
  TechStackSection,
  FeaturesSection,
  TourSection,
  PricingSection,
  FAQSection,
  CTASection,
} from "@/components/marketing/sections";

// Icon mapping for features
const featureIconMap: Record<string, LucideIcon> = {
  ReceiptText,
  BrainCircuit,
  BarChart3,
};

// Data definitions - all serializable (no React components)
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

const landingFeatures = [
  {
    title: "Expense capture that stays clean",
    description:
      "Record and categorize expenses quickly so teams stay focused on decisions, not spreadsheet overhead.",
    iconName: "ReceiptText",
  },
  {
    title: "AI-guided controls",
    description:
      "Use copilot alerts and policy checks to flag unusual spend and improve consistency before month-end.",
    iconName: "BrainCircuit",
  },
  {
    title: "Decision-ready analytics",
    description:
      "Track trends, categories, and team behavior in a clear workspace that supports fast reviews.",
    iconName: "BarChart3",
  },
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
    title: "Apply AI guidance and policy checks",
    description:
      "Use copilot alerts and budget-aware policies to spot risk patterns before they grow into surprises.",
    detail: "Prevent drift with explainable decision support.",
  },
  {
    title: "Review trends and act with team controls",
    description:
      "Monitor analytics, manage member roles, and keep operations aligned with clear ownership.",
    detail: "Move from raw spend data to actionable priorities.",
  },
] as const;

const plans = [
  {
    name: "Free" as const,
    description: "Perfect for small teams getting started",
    price: "$0",
    period: "forever",
    badge: "No card required",
    features: [
      "Up to 3 team members",
      "100 expenses per month",
      "Essential dashboard",
      "Basic expense tools",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Pro" as const,
    description: "For teams ready to scale their operations",
    price: "$29",
    period: "per month",
    isPopular: true,
    badge: "Most Popular",
    features: [
      "Unlimited team members",
      "Unlimited expenses",
      "Smart analytics & insights",
      "Export & advanced reports",
      "Priority support",
    ],
    cta: "Start Pro Trial",
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
      "Yes. The platform includes budget policy checks and AI-guided alerts to help teams catch risky spend patterns early.",
  },
] as const;

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-indigo-100/80 bg-background/80 backdrop-blur-md dark:border-indigo-900/40">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-linear-to-br from-indigo-600 to-violet-600 p-0.5"
          >
            <Image
              src="/favicon.ico"
              alt="SpendScope logo"
              width={28}
              height={28}
              className="size-7 rounded-[6px]"
              priority
            />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            SpendScope
          </span>
        </Link>

        {/* Desktop Navigation */}
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

        {/* Desktop Auth Buttons */}
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" className="hidden sm:inline-flex"
          >
            <Link href="/login">Sign In</Link>
          </Button>
          <MagneticButton>
            <Button
              asChild
              className="bg-gradient-brand text-white shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30"
            >
              <Link href="/login?intent=signup">
                Start Free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </MagneticButton>
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 py-4">
                {/* Mobile Navigation Links */}
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

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Mobile Auth Buttons */}
                <div className="flex flex-col gap-3">
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      asChild
                      className="w-full bg-gradient-brand text-white shadow-md shadow-indigo-500/20"
                    >
                      <Link href="/login?intent=signup">
                        Start Free
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

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-slate-50/50 py-8 dark:bg-slate-950/50">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-4 px-4 text-sm text-muted-foreground sm:px-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-linear-to-br from-indigo-600 to-violet-600 p-[1px]">
            <Image
              src="/favicon.ico"
              alt="SpendScope"
              width={20}
              height={20}
              className="size-5 rounded-[4px]"
            />
          </span>
          <span className="font-medium">{currentYear} SpendScope</span>
        </div>
        <p className="text-xs">Built with modern technology for modern finance teams.</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <HeroSection trustItems={trustItems} />
        <TechStackSection technologies={technologies} />
        <FeaturesSection features={landingFeatures} iconMap={featureIconMap} />
        <TourSection tourSteps={tourSteps} />
        <PricingSection plans={plans} />
        <FAQSection faqItems={faqItems} />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
