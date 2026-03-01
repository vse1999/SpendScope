"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";

interface FloatingElementProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly duration?: number;
  readonly distance?: number;
  readonly delay?: number;
}

export function FloatingElement({
  children,
  className = "",
  duration = 3,
  distance = 10,
  delay = 0,
}: FloatingElementProps): React.JSX.Element {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();

  if (!allowEnhancedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={{
        y: [-distance, distance, -distance],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

interface PulseGlowProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly duration?: number;
  readonly glowColor?: string;
}

export function PulseGlow({
  children,
  className = "",
  duration = 2,
  glowColor = "rgba(99, 102, 241, 0.5)",
}: PulseGlowProps): React.JSX.Element {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();

  if (!allowEnhancedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={{
        boxShadow: [
          `0 0 20px ${glowColor}`,
          `0 0 40px ${glowColor}`,
          `0 0 20px ${glowColor}`,
        ],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

interface MagneticButtonProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function MagneticButton({
  children,
  className = "",
}: MagneticButtonProps): React.JSX.Element {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();

  if (!allowEnhancedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
}
