import Image from "next/image";
import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

interface TechnologyItem {
  readonly name: string;
  readonly logoPath: string;
  readonly logoAlt: string;
  readonly colorModeClassName?: string;
}

interface TechStackSectionProps {
  readonly technologies: readonly TechnologyItem[];
}

export function TechStackSection({ technologies }: TechStackSectionProps): ReactElement {
  return (
    <section className="relative py-10" aria-labelledby="technology-heading">
      <div className="mb-6 text-center">
        <p
          id="technology-heading"
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Built with modern technology
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-950/50 sm:p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {technologies.map((technology) => (
            <div
              key={technology.name}
              className="group flex h-14 min-w-0 items-center justify-center rounded-xl bg-white/50 px-4 transition-all duration-300 hover:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-800/50"
            >
              <Image
                src={technology.logoPath}
                alt={technology.logoAlt}
                width={120}
                height={32}
                className={cn(
                  "h-6 w-auto max-w-full object-contain opacity-70 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0",
                  technology.colorModeClassName
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
