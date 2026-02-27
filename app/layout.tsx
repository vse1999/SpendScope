import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import { shouldAllowIndexing } from "@/lib/seo/deployment-environment";
import { getSiteUrlObject } from "@/lib/seo/site-url";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const allowIndexing = shouldAllowIndexing();

export const metadata: Metadata = {
  metadataBase: getSiteUrlObject(),
  title: {
    default: "SpendScope - Enterprise Expense Analytics",
    template: "%s | SpendScope",
  },
  description: "Track, analyze, and manage company expenses with policy-aware insights",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SpendScope",
    title: "SpendScope - Enterprise Expense Analytics",
    description:
      "Track, analyze, and manage company expenses with policy-aware insights",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SpendScope",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SpendScope - Enterprise Expense Analytics",
    description:
      "Track, analyze, and manage company expenses with policy-aware insights",
    images: ["/twitter-image"],
  },
  robots: {
    index: allowIndexing,
    follow: allowIndexing,
    googleBot: {
      index: allowIndexing,
      follow: allowIndexing,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favico/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favico/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favico/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favico/favicon-256.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={true}
        >
          <OrganizationJsonLd />
          {children}
          <Toaster />
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
