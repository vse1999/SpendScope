"use client";

import { motion } from "framer-motion";
import { useMemo, useSyncExternalStore } from "react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";

interface Particle {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly duration: number;
  readonly delay: number;
  readonly opacity: number;
}

interface ParticleFieldProps {
  readonly className?: string;
  readonly particleCount?: number;
  readonly color?: string;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    x: Number((seededRandom(index * 1000) * 100).toFixed(4)),
    y: Number((seededRandom(index * 2000) * 100).toFixed(4)),
    size: Number((seededRandom(index * 3000) * 3 + 1).toFixed(5)),
    duration: Number((seededRandom(index * 4000) * 20 + 15).toFixed(4)),
    delay: Number((seededRandom(index * 5000) * 5).toFixed(4)),
    opacity: Number((seededRandom(index * 6000) * 0.3 + 0.1).toFixed(6)),
  }));
}

function EnhancedParticleField({
  className = "",
  particleCount = 30,
  color = "rgba(99, 102, 241, 0.4)",
}: ParticleFieldProps): React.JSX.Element {
  const particles = useMemo(() => generateParticles(particleCount), [particleCount]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x.toFixed(4)}%`,
            top: `${particle.y.toFixed(4)}%`,
            width: `${particle.size.toFixed(5)}px`,
            height: `${particle.size.toFixed(5)}px`,
            backgroundColor: color,
            opacity: particle.opacity.toFixed(6),
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}

export function ParticleField({
  className = "",
  particleCount = 30,
  color = "rgba(99, 102, 241, 0.4)",
}: ParticleFieldProps): React.JSX.Element | null {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();
  const hasHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  if (!allowEnhancedMotion || !hasHydrated) {
    return null;
  }

  return (
    <EnhancedParticleField
      className={className}
      particleCount={particleCount}
      color={color}
    />
  );
}
