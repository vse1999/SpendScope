import { Sora } from "next/font/google";

/**
 * Shared display font for landing page sections
 * Using CSS custom properties approach for optimal performance
 * Font is loaded once and shared across all sections via CSS variable
 */
export const displayFont = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});
