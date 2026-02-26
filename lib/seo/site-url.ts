const DEFAULT_SITE_URL = "https://v0-spend-scope.vercel.app";

function normalizeSiteUrl(rawUrl: string | undefined): string {
  const trimmed = rawUrl?.trim();

  if (!trimmed) {
    return DEFAULT_SITE_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.APP_URL ?? process.env.NEXTAUTH_URL);
}

export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl());
}
