import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const DEFAULT_ENV_FILE = ".env";
const LOCAL_ENV_FILE = ".env.local";
const PRISMA_PROXY_PREFIXES = ["prisma://", "prisma+postgres://"] as const;

function loadEnvironmentFile(relativePath: string, override: boolean): void {
  const absolutePath = resolve(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    return;
  }

  loadDotEnv({ path: absolutePath, override });
}

function loadScriptEnvironment(): void {
  // Match Next.js precedence: .env first, then .env.local overrides.
  loadEnvironmentFile(DEFAULT_ENV_FILE, false);
  loadEnvironmentFile(LOCAL_ENV_FILE, true);
}

function getDatabaseUrlOrThrow(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing. Add a direct postgresql:// URL to .env.local before running scripts."
    );
  }

  const usesProxyUrl = PRISMA_PROXY_PREFIXES.some((prefix) =>
    databaseUrl.startsWith(prefix)
  );

  if (usesProxyUrl) {
    throw new Error(
      "DATABASE_URL resolved to a Prisma proxy URL. Use a direct postgresql:// connection string in .env.local for script execution."
    );
  }

  return databaseUrl;
}

loadScriptEnvironment();

const databaseUrl = getDatabaseUrlOrThrow();
const globalForPrismaScripts = globalThis as unknown as {
  prismaScripts: PrismaClient | undefined;
};

export const prisma =
  globalForPrismaScripts.prismaScripts ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaScripts.prismaScripts = prisma;
}
