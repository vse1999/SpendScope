"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useSyncExternalStore } from "react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { cn } from "@/lib/utils";

// Lazy load animation components
const TextReveal = dynamic(
  () => import("@/components/marketing/animations").then((m) => m.TextReveal),
  { ssr: false, loading: () => <div /> }
);

const MotionDiv = dynamic(
  () => import("framer-motion").then((m) => m.motion.div),
  { ssr: false }
);

interface TechnologyItem {
  readonly name: string;
  readonly logoPath: string;
  readonly logoAlt: string;
  readonly colorModeClassName?: string;
}

interface TechStackSectionProps {
  readonly technologies: readonly TechnologyItem[];
}

export function TechStackSection({
  technologies,
}: TechStackSectionProps): React.JSX.Element {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();
  const hasHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const shouldRenderAnimatedMarquee = allowEnhancedMotion && hasHydrated;
  const duplicatedTechnologies = [...technologies, ...technologies];
  
  // Calculate actual scroll distance: item width (160px) + gap (48px) = 208px per item
  const itemWidth = 160; // w-40 = 10rem = 160px
  const gapWidth = 48;   // gap-12 = 3rem = 48px
  const totalSetWidth = (itemWidth + gapWidth) * technologies.length;

  return (
    <section className="relative py-10">
      <TextReveal className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Built with modern technology
        </p>
      </TextReveal>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-slate-50/50 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-950/50"
      >
        {/* Gradient masks for fade effect */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-background to-transparent" />

        {shouldRenderAnimatedMarquee ? (
          // Animated marquee with correct scroll distance
          <MotionDiv
            className="flex gap-12 py-8"
            animate={{
              x: [0, -totalSetWidth],
            }}
            transition={{
              x: {
                duration: 30,
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
              },
            }}
          >
            {duplicatedTechnologies.map((technology, index) => (
              <div
                key={`${technology.name}-${index}`}
                className="group flex h-14 w-40 shrink-0 items-center justify-center rounded-xl bg-white/50 px-4 transition-all duration-300 hover:bg-white hover:scale-105 dark:bg-slate-900/50 dark:hover:bg-slate-800/50"
              >
                <Image
                  src={technology.logoPath}
                  alt={technology.logoAlt}
                  width={120}
                  height={32}
                  className={cn(
                    "h-6 w-auto max-w-full object-contain opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0",
                    technology.colorModeClassName
                  )}
                />
              </div>
            ))}
          </MotionDiv>
        ) : (
          // Static grid for mobile and reduced-motion modes
          <div className="grid grid-cols-2 gap-4 px-4 py-6 sm:grid-cols-4 sm:px-8">
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
                    "h-6 w-auto max-w-full object-contain opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0",
                    technology.colorModeClassName
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
