"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useSyncExternalStore } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface ParticleFieldProps {
  readonly className?: string;
  readonly particleCount?: number;
  readonly color?: string;
}

// Seeded random number generator for consistent SSR/client hydration
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: seededRandom(i * 1000) * 100,
    y: seededRandom(i * 2000) * 100,
    size: seededRandom(i * 3000) * 3 + 1,
    duration: seededRandom(i * 4000) * 20 + 15,
    delay: seededRandom(i * 5000) * 5,
    opacity: seededRandom(i * 6000) * 0.3 + 0.1,
  }));
}

// Hook to detect if we're on the client (hydration-safe)
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ParticleField({ 
  className = "", 
  particleCount = 30,
  color = "rgba(99, 102, 241, 0.4)"
}: ParticleFieldProps) {
  const isClient = useIsClient();
  const shouldReduceMotion = useReducedMotion();
  
  // Use lazy initialization with seeded random for consistent results
  const particles = useMemo(() => generateParticles(particleCount), [particleCount]);

  // On server or during hydration, render container only (no particles)
  // After hydration on client, check reduced motion preference
  const showParticles = isClient && !shouldReduceMotion;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {showParticles && particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: color,
            opacity: particle.opacity,
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
