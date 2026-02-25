"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";

interface MeshGradientProps {
  readonly className?: string;
}

// Hook to detect if we're on the client (hydration-safe)
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function MeshGradient({ className = "" }: MeshGradientProps) {
  const isClient = useIsClient();
  const shouldReduceMotion = useReducedMotion();

  // On server/during hydration: render static orbs (always safe)
  // After hydration on client: use actual reduced motion preference
  const useAnimatedOrbs = isClient && !shouldReduceMotion;

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Gradient orbs - animated or static based on preference */}
      {useAnimatedOrbs ? (
        // Animated orbs
        <>
          <motion.div
            className="absolute -left-[20%] -top-[20%] h-[60%] w-[60%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
            }}
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          <motion.div
            className="absolute -right-[10%] top-[20%] h-[50%] w-[50%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
            }}
            animate={{
              x: [0, -40, 0],
              y: [0, 60, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
          
          <motion.div
            className="absolute bottom-[10%] left-[10%] h-[40%] w-[40%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -40, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4,
            }}
          />
          
          <motion.div
            className="absolute bottom-[20%] right-[20%] h-[35%] w-[35%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
            }}
            animate={{
              x: [0, -20, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 6,
            }}
          />
        </>
      ) : (
        // Static orbs for reduced motion or during SSR/hydration
        <>
          <div
            className="absolute -left-[20%] -top-[20%] h-[60%] w-[60%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -right-[10%] top-[20%] h-[50%] w-[50%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-[10%] left-[10%] h-[40%] w-[40%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-[20%] right-[20%] h-[35%] w-[35%] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
            }}
          />
        </>
      )}
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
