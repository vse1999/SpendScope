
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LandingPage } from "@/components/marketing/landing-page";
import { SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { getHomeRedirectPath } from "@/lib/landing/home-route";

export const metadata: Metadata = {
  title: "SpendScope | Expense Control for Modern Teams",
  description:
    "Expense control for modern teams with fast capture, clear policy guidance, and confident analytics decisions.",
};

export default async function HomePage(): Promise<ReactElement> {
  const session = await auth();
  const redirectPath = getHomeRedirectPath(session);

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <>
      <SoftwareApplicationJsonLd />
      <LandingPage />
    </>
  );
}
