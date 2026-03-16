import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import type { ReactElement } from "react";

import { MarketingScrollLink } from "@/components/marketing/marketing-scroll-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export function CTASection(): ReactElement {
  return (
    <section className="relative py-16">
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5" />

        <Card className="relative border-indigo-200/80 bg-white/80 backdrop-blur-xl dark:border-indigo-900/50 dark:bg-slate-950/80">
          <CardHeader className="gap-3 text-center">
            <CardTitle className={cn(displayFont.className, "mx-auto max-w-2xl text-3xl sm:text-4xl")}>
              Ready to launch your <span className="text-gradient">expense workspace</span>?
            </CardTitle>
            <CardDescription className="mx-auto max-w-xl text-lg">
              Spin up your account and validate your full flow in a
              production-style product experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-brand text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
            >
              <Link href="/signup">
                Start with Free Tier
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="glass-card transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <MarketingScrollLink href="#product">
                Explore Product
                <Download className="size-4" />
              </MarketingScrollLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
