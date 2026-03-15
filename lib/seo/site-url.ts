const LOCAL_DEVELOPMENT_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(rawUrl: string | undefined): string | null {
  const trimmed = rawUrl?.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function resolveVercelSiteUrl(): string | null {
  const vercelEnvironment = process.env.VERCEL_ENV?.trim().toLowerCase();

  if (vercelEnvironment === "production") {
    return (
      normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
      normalizeSiteUrl(process.env.VERCEL_URL)
    );
  }

  if (vercelEnvironment === "preview") {
    return normalizeSiteUrl(process.env.VERCEL_URL);
  }

  return null;
}

export function getSiteUrl(): string {
  return (
    normalizeSiteUrl(process.env.APP_URL) ??
    normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeSiteUrl(process.env.NEXTAUTH_URL) ??
    resolveVercelSiteUrl() ??
    LOCAL_DEVELOPMENT_SITE_URL
  );
}

export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}
