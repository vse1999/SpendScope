"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface RevealOnScrollProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delayMs?: number;
  readonly threshold?: number;
}

export function RevealOnScroll({
  children,
  className,
  delayMs = 0,
  threshold = 0.2,
}: RevealOnScrollProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) {
          return;
        }
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={containerRef}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={cn(
        "motion-reduce:opacity-100 motion-reduce:translate-y-0 transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className
      )}
    >
      {children}
    </div>
  );
}
