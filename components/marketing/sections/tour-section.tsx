import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface TourStep {
  readonly title: string;
  readonly description: string;
  readonly detail: string;
}

interface TourSectionProps {
  readonly tourSteps: readonly TourStep[];
}

export function TourSection({ tourSteps }: TourSectionProps): ReactElement {
  return (
    <section id="tour" aria-labelledby="tour-heading" className="scroll-mt-24 py-16">
      <div className="mb-10">
        <h2
          id="tour-heading"
          className={cn(
            displayFont.className,
            "text-3xl font-semibold tracking-tight sm:text-4xl"
          )}
        >
          Three-step <span className="text-gradient">operating flow</span>
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Clear sequence from capture to control to review. Each stage keeps
          teams moving from raw expense data to accountable decisions.
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-0 hidden h-full w-px bg-gradient-to-b from-indigo-500 via-violet-500 to-cyan-500 md:block" />
        <div className="space-y-6">
          {tourSteps.map((step, index) => (
            <div key={step.title} className="relative flex gap-6 md:items-start">
              <div className="relative z-10 hidden shrink-0 md:block">
                <div className="flex size-10 items-center justify-center rounded-full border-2 border-indigo-500 bg-background shadow-lg shadow-indigo-500/20">
                  <span className="text-sm font-semibold text-indigo-600">
                    {index + 1}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <Card className="border-border/80 bg-card/85 transition-transform duration-200 hover:-translate-y-0.5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="border-indigo-300/70 text-indigo-700 dark:text-indigo-300 md:hidden"
                      >
                        Step {index + 1}
                      </Badge>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
