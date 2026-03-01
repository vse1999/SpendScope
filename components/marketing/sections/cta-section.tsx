"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";

import { useMarketingDeviceProfile } from "@/components/marketing/hooks/use-marketing-device-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { displayFont } from "@/lib/fonts";
import { TextReveal } from "@/components/marketing/animations";
import { MeshGradient } from "@/components/marketing/effects";

export function CTASection(): React.JSX.Element {
  const { allowEnhancedMotion } = useMarketingDeviceProfile();

  return (
    <section className="relative py-16">
      <TextReveal>
        <div className="relative overflow-hidden rounded-2xl">
          {/* Background */}
          <div className="absolute inset-0">
            <MeshGradient />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5" />
          </div>

          <Card className="relative border-indigo-200/80 bg-white/80 backdrop-blur-xl dark:border-indigo-900/50 dark:bg-slate-950/80"
          >
            <CardHeader className="gap-3 text-center">
              <CardTitle
                className={cn(
                  displayFont.className,
                  "mx-auto max-w-2xl text-3xl sm:text-4xl"
                )}
              >
                Ready to launch your{" "}
                <span className="text-gradient">expense workspace</span>?
              </CardTitle>
              <CardDescription className="mx-auto max-w-xl text-lg"
>
                Spin up your account and validate your full flow in a
                production-style product experience.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex flex-wrap items-center justify-center gap-4">
              <motion.div
                whileHover={allowEnhancedMotion ? { scale: 1.02 } : undefined}
                whileTap={allowEnhancedMotion ? { scale: 0.98 } : undefined}
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-brand text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
                >
                  <Link href="/signup">
                    Start with Free Tier
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={allowEnhancedMotion ? { scale: 1.02 } : undefined}
                whileTap={allowEnhancedMotion ? { scale: 0.98 } : undefined}
              >
                <Button asChild size="lg" variant="outline" className="glass-card"
                >
                  <Link href="#product">
                    Explore Product
                    <Download className="size-4" />
                  </Link>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </TextReveal>
    </section>
  );
}
