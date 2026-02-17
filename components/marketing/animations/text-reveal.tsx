"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface TextRevealProps {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly duration?: number;
  readonly className?: string;
  /**
   * Animation type:
   * - "fade-up": Fade in and slide up
   * - "fade-in": Simple fade in
   * - "blur-in": Fade in with blur effect
   * - "word-by-word": Each word animates separately
   * - "letter-by-letter": Each letter animates separately
   */
  readonly type?: "fade-up" | "fade-in" | "blur-in" | "word-by-word" | "letter-by-letter";
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const wordVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

const letterVariants = {
  hidden: { 
    opacity: 0, 
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

export function TextReveal({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
  type = "fade-up",
}: TextRevealProps) {
  if (type === "word-by-word" && typeof children === "string") {
    const words = children.split(" ");
    
    return (
      <motion.span
        className={`inline-flex flex-wrap ${className}`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            className="mr-[0.25em] inline-block"
            variants={wordVariants}
            transition={{ delay: delay + index * 0.05 }}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    );
  }

  if (type === "letter-by-letter" && typeof children === "string") {
    const letters = children.split("");
    
    return (
      <motion.span
        className={`inline-flex flex-wrap ${className}`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {letters.map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            className="inline-block"
            variants={letterVariants}
            transition={{ delay: delay + index * 0.02 }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </motion.span>
    );
  }

  const variants = {
    fadeUp: {
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: {
          duration,
          delay,
          ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        },
      },
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: {
          duration,
          delay,
          ease: "easeOut" as const,
        },
      },
    },
    blurIn: {
      hidden: { opacity: 0, filter: "blur(10px)" },
      visible: { 
        opacity: 1, 
        filter: "blur(0px)",
        transition: {
          duration,
          delay,
          ease: "easeOut" as const,
        },
      },
    },
  };

  const selectedVariant = type === "fade-up" ? variants.fadeUp 
    : type === "fade-in" ? variants.fadeIn 
    : variants.blurIn;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={selectedVariant}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly staggerDelay?: number;
  readonly delayChildren?: number;
}

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.1,
  delayChildren = 0,
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
