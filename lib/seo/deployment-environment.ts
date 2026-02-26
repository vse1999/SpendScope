function getVercelEnvironment(): string | undefined {
  return process.env.VERCEL_ENV?.trim().toLowerCase();
}

export function isPreviewDeployment(): boolean {
  return getVercelEnvironment() === "preview";
}

export function shouldAllowIndexing(): boolean {
  return !isPreviewDeployment();
}
