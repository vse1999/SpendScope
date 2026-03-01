"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";

interface TiltCardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly tiltAmount?: number;
  readonly perspective?: number;
  readonly scale?: number;
  readonly glowColor?: string;
  readonly showGlow?: boolean;
}

function EnhancedTiltCard({
  children,
  className = "",
  tiltAmount = 10,
  perspective = 1000,
  scale = 1.02,
  glowColor = "rgba(99, 102, 241, 0.3)",
  showGlow = true,
}: TiltCardProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springConfig = { stiffness: 300, damping: 30 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);
  const rotateX = useTransform(ySpring, [0, 1], [tiltAmount, -tiltAmount]);
  const rotateY = useTransform(xSpring, [0, 1], [-tiltAmount, tiltAmount]);
  const background = useMotionTemplate`
    radial-gradient(
      600px circle at ${useTransform(xSpring, [0, 1], [0, 100])}% ${useTransform(ySpring, [0, 1], [0, 100])}%,
      ${glowColor},
      transparent 40%
    )
  `;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!ref.current) {
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const xPos = (event.clientX - rect.left) / rect.width;
    const yPos = (event.clientY - rect.top) / rect.height;

    x.set(xPos);
    y.set(yPos);
  };

  const handleMouseLeave = (): void => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        perspective,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ scale }}
        transition={{ duration: 0.2 }}
        className="relative h-full"
      >
        {children}
        {showGlow && (
          <motion.div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300"
            style={{ background }}
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

export function TiltCard({
  children,
  className = "",
  tiltAmount = 10,
  perspective = 1000,
  scale = 1.02,
  glowColor = "rgba(99, 102, 241, 0.3)",
  showGlow = true,
}: TiltCardProps): React.JSX.Element {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();

  if (!allowEnhancedMotion) {
    return <div className={`relative ${className}`}>{children}</div>;
  }

  return (
    <EnhancedTiltCard
      className={className}
      tiltAmount={tiltAmount}
      perspective={perspective}
      scale={scale}
      glowColor={glowColor}
      showGlow={showGlow}
    >
      {children}
    </EnhancedTiltCard>
  );
}
