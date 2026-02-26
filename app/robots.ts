import type { MetadataRoute } from "next";

import { isPreviewDeployment } from "@/lib/seo/deployment-environment";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const isPreview = isPreviewDeployment();

  return {
    rules: [
      {
        userAgent: "*",
        allow: isPreview ? [] : "/",
        disallow: isPreview
          ? "/"
          : [
              "/dashboard/",
              "/api/",
              "/login",
              "/onboarding",
              "/invite/accept",
            ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
