"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

interface LazyMotionWrapperProps {
  readonly children: ReactNode;
}

/**
 * Lazy motion wrapper that only loads framer-motion's DOM animations
 * when needed. This reduces the initial bundle size significantly.
 */
export function LazyMotionWrapper({ children }: LazyMotionWrapperProps): React.JSX.Element {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
