"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { TextReveal, StaggerContainer, StaggerItem } from "@/components/marketing/animations";

interface FAQItem {
  readonly question: string;
  readonly answer: string;
}

interface FAQSectionProps {
  readonly faqItems: readonly FAQItem[];
}

function FAQAccordion({ 
  item, 
  index, 
  isOpen, 
  onToggle 
}: { 
  readonly item: FAQItem; 
  readonly index: number;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}) {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();

  return (
    <div className="w-full rounded-xl border border-border/80 bg-card/80">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left font-medium text-foreground transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
        aria-expanded={isOpen}
        aria-controls={`faq-content-${index}`}
      >
        <span className="flex items-center gap-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
          >
            {index + 1}
          </span>
          {item.question}
        </span>
        <motion.div
          className="shrink-0"
          animate={allowEnhancedMotion ? { rotate: isOpen ? 45 : 0 } : undefined}
          transition={allowEnhancedMotion ? { duration: 0.2 } : undefined}
        >
          <Plus className="size-5 text-muted-foreground transition-colors duration-300" />
        </motion.div>
      </button>

      <div
        id={`faq-content-${index}`}
        aria-hidden={!isOpen}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 border-t border-border/50 px-5 pb-5 pt-4">
          <p className="pl-12 text-sm leading-relaxed text-muted-foreground">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FAQSection({ faqItems }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24 py-16">
      <TextReveal>
        <div className="mb-10 text-center">
          <h2
            id="faq-heading"
            className={cn(
              displayFont.className,
              "text-3xl font-semibold tracking-tight sm:text-4xl"
            )}
          >
            Frequently asked{" "}
            <span className="text-gradient">questions</span>
          </h2>
        </div>
      </TextReveal>

      <StaggerContainer className="space-y-4" staggerDelay={0.1} delayChildren={0.2}>
        {faqItems.map((item, index) => (
          <StaggerItem key={item.question}>
            <FAQAccordion 
              item={item} 
              index={index} 
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
