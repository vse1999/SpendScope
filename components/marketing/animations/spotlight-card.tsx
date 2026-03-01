"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";

interface SpotlightCardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly spotlightColor?: string;
  readonly borderColor?: string;
  readonly showBorder?: boolean;
}

function EnhancedSpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(99, 102, 241, 0.15)",
  borderColor = "rgba(99, 102, 241, 0.3)",
  showBorder = true,
}: SpotlightCardProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const background = useMotionTemplate`
    radial-gradient(
      650px circle at ${mouseX}px ${mouseY}px,
      ${spotlightColor},
      transparent 80%
    )
  `;
  const border = useMotionTemplate`
    radial-gradient(
      400px circle at ${mouseX}px ${mouseY}px,
      ${borderColor},
      transparent 100%
    )
  `;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!ref.current) {
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden ${className}`}
    >
      {showBorder && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: border,
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "xor",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
        />
      )}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(99, 102, 241, 0.15)",
  borderColor = "rgba(99, 102, 241, 0.3)",
  showBorder = true,
}: SpotlightCardProps): React.JSX.Element {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();

  if (!allowEnhancedMotion) {
    return <div className={`relative overflow-hidden ${className}`}>{children}</div>;
  }

  return (
    <EnhancedSpotlightCard
      className={className}
      spotlightColor={spotlightColor}
      borderColor={borderColor}
      showBorder={showBorder}
    >
      {children}
    </EnhancedSpotlightCard>
  );
}
