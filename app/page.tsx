
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LandingPage } from "@/components/marketing/landing-page";
import { getHomeRedirectPath } from "@/lib/landing/home-route";

export const metadata: Metadata = {
  title: "SpendScope | Modern Expense Intelligence for Teams",
  description:
    "Track spending, enforce controls, and monitor analytics with policy-aware insights built for modern teams.",
};

export default async function HomePage(): Promise<ReactElement> {
  const session = await auth();
  const redirectPath = getHomeRedirectPath(session);

  if (redirectPath) {
    redirect(redirectPath);
  }

  return <LandingPage />;
}
