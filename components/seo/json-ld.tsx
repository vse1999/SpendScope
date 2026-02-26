import type { ReactElement } from "react";

import { getSiteUrl } from "@/lib/seo/site-url";

interface JsonLdScriptProps {
  id: string;
  data: Record<string, unknown>;
}

function JsonLdScript({ id, data }: JsonLdScriptProps): ReactElement {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd(): ReactElement {
  const siteUrl = getSiteUrl();

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SpendScope",
    url: siteUrl,
    logo: `${siteUrl}/favico/favicon-256.png`,
    description:
      "Track spending, enforce controls, and monitor analytics with policy-aware insights built for modern teams.",
  };

  return <JsonLdScript id="spendscope-organization-jsonld" data={data} />;
}

export function SoftwareApplicationJsonLd(): ReactElement {
  const siteUrl = getSiteUrl();

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SpendScope",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return <JsonLdScript id="spendscope-software-jsonld" data={data} />;
}
