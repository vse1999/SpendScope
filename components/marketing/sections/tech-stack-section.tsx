"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { TextReveal } from "@/components/marketing/animations";

interface TechnologyItem {
  readonly name: string;
  readonly logoPath: string;
  readonly logoAlt: string;
  readonly colorModeClassName?: string;
}

interface TechStackSectionProps {
  readonly technologies: readonly TechnologyItem[];
}

// Hook to detect if we're on the client (hydration-safe)
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function TechStackSection({ technologies }: TechStackSectionProps) {
  const isClient = useIsClient();
  const shouldReduceMotion = useReducedMotion();
  
  // Double the array for seamless infinite scroll
  const duplicatedTechnologies = [...technologies, ...technologies];
  
  // Calculate actual scroll distance: item width (160px) + gap (48px) = 208px per item
  const itemWidth = 160; // w-40 = 10rem = 160px
  const gapWidth = 48;   // gap-12 = 3rem = 48px
  const totalSetWidth = (itemWidth + gapWidth) * technologies.length;

  // On server/during hydration: render static grid (always safe)
  // After hydration on client: use actual reduced motion preference
  const useAnimatedMarquee = isClient && !shouldReduceMotion;

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

        {useAnimatedMarquee ? (
          // Animated marquee with correct scroll distance
          <motion.div
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
              <motion.div
                key={`${technology.name}-${index}`}
                className="group flex h-14 w-40 shrink-0 items-center justify-center rounded-xl bg-white/50 px-4 transition-all duration-300 hover:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-800/50"
                whileHover={{ scale: 1.05 }}
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
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // Static grid for reduced motion or during SSR/hydration
          <div className="flex justify-center gap-12 py-8 px-24">
            {technologies.map((technology) => (
              <div
                key={technology.name}
                className="group flex h-14 w-40 shrink-0 items-center justify-center rounded-xl bg-white/50 px-4 transition-all duration-300 hover:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-800/50"
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
