#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const failures = [];
const warnings = [];

function isTrue(value) {
  return String(value).toLowerCase() === "true";
}

function getEnv(name) {
  return (process.env[name] || "").trim();
}

function requireEnv(name) {
  const value = getEnv(name);
  if (!value) {
    failures.push(`${name} is required.`);
  }
  return value;
}

function assertFalse(name) {
  if (isTrue(getEnv(name))) {
    failures.push(`${name} must be false for deployed project environments.`);
  }
}

function assertHttpsUrl(name) {
  const value = requireEnv(name);
  if (!value) {
    return;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      failures.push(`${name} must use https:// in deployed environments.`);
    }
  } catch {
    failures.push(`${name} must be a valid URL.`);
  }
}

function getKeyMode(key, testPrefix, livePrefix) {
  if (!key) return "missing";
  if (key.startsWith(testPrefix)) return "test";
  if (key.startsWith(livePrefix)) return "live";
  return "unknown";
}

function validateStripeMode() {
  const billingEnabled = isTrue(getEnv("NEXT_PUBLIC_ENABLE_BILLING"));
  const allowLiveStripeKeys = isTrue(getEnv("ALLOW_LIVE_STRIPE_KEYS"));

  if (!billingEnabled) {
    warnings.push("NEXT_PUBLIC_ENABLE_BILLING is false. Billing UI/API flows are disabled.");
    return;
  }

  const secretKey = requireEnv("STRIPE_SECRET_KEY");
  const publishableKey = requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  requireEnv("STRIPE_WEBHOOK_SECRET");
  requireEnv("STRIPE_PRO_MONTHLY_PRICE_ID");
  const webhookSecret = getEnv("STRIPE_WEBHOOK_SECRET");
  const monthlyPriceId = getEnv("STRIPE_PRO_MONTHLY_PRICE_ID");

  const secretMode = getKeyMode(secretKey, "sk_test_", "sk_live_");
  const publishableMode = getKeyMode(publishableKey, "pk_test_", "pk_live_");

  if (secretMode === "unknown") {
    failures.push("STRIPE_SECRET_KEY must start with sk_test_ or sk_live_.");
  }
  if (publishableMode === "unknown") {
    failures.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_.");
  }

  const hasLiveKey = secretMode === "live" || publishableMode === "live";
  if (hasLiveKey && !allowLiveStripeKeys) {
    failures.push("Live Stripe keys detected but ALLOW_LIVE_STRIPE_KEYS is not true.");
  }

  const mixedMode =
    (secretMode === "test" && publishableMode === "live") ||
    (secretMode === "live" && publishableMode === "test");

  if (mixedMode) {
    failures.push("Stripe key mode mismatch: secret and publishable keys must both be test or both be live.");
  }

  if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
    failures.push("STRIPE_WEBHOOK_SECRET must start with whsec_.");
  }

  if (monthlyPriceId && !monthlyPriceId.startsWith("price_")) {
    failures.push("STRIPE_PRO_MONTHLY_PRICE_ID must start with price_.");
  }
}

function validateCoreEnv() {
  assertHttpsUrl("NEXTAUTH_URL");
  assertHttpsUrl("APP_URL");
  requireEnv("NEXTAUTH_SECRET");
  requireEnv("GOOGLE_CLIENT_ID");
  requireEnv("GOOGLE_CLIENT_SECRET");
  requireEnv("GITHUB_CLIENT_ID");
  requireEnv("GITHUB_CLIENT_SECRET");

  assertFalse("ALLOW_BILLING_RESET");
  assertFalse("NEXT_PUBLIC_ALLOW_BILLING_RESET");
}

function validateOperationalEnv() {
  if (!getEnv("UPSTASH_REDIS_REST_URL") || !getEnv("UPSTASH_REDIS_REST_TOKEN")) {
    warnings.push("Upstash Redis is not fully configured. Production should not rely on in-memory rate limiting.");
  }

  if (!getEnv("SENTRY_DSN") || !getEnv("NEXT_PUBLIC_SENTRY_DSN")) {
    warnings.push("Sentry DSNs are missing. Production monitoring visibility will be limited.");
  }

  if (isTrue(getEnv("SENTRY_SEND_DEFAULT_PII"))) {
    warnings.push("SENTRY_SEND_DEFAULT_PII=true. Ensure this is intentional for privacy compliance.");
  }
}

function scanForTrackedSecrets() {
  let trackedFiles = getTrackedFilesFromGit();

  if (trackedFiles.length === 0) {
    trackedFiles = collectRepositoryFiles(process.cwd());
  }

  const ignoredExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".pdf",
    ".zip",
    ".lock",
  ]);

  const patterns = [
    { name: "Stripe secret key", regex: /sk_(test|live)_[A-Za-z0-9]{16,}/g },
    { name: "Stripe publishable key", regex: /pk_(test|live)_[A-Za-z0-9]{16,}/g },
    { name: "Stripe webhook secret", regex: /whsec_[A-Za-z0-9]{16,}/g },
    { name: "AWS access key", regex: /AKIA[0-9A-Z]{16}/g },
    { name: "Resend API key", regex: /re_[A-Za-z0-9]{16,}/g },
    { name: "Private key block", regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
    { name: "Database URL credential", regex: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/g },
  ];

  for (const file of trackedFiles) {
    const ext = path.extname(file).toLowerCase();
    if (ignoredExtensions.has(ext)) {
      continue;
    }

    let content = "";
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    for (const pattern of patterns) {
      const matches = content.match(pattern.regex);
      if (!matches || matches.length === 0) {
        continue;
      }

      const nonPlaceholderMatches = matches.filter((value) => !isPlaceholderSecret(value));
      if (nonPlaceholderMatches.length > 0) {
        failures.push(`Potential secret leak in ${file}: ${pattern.name}`);
      }
    }
  }
}

function getTrackedFilesFromGit() {
  const gitBinaries = [
    "git",
    "C:\\Program Files\\Git\\mingw64\\bin\\git.exe",
    "C:\\Program Files\\Git\\cmd\\git.exe",
  ];

  for (const binary of gitBinaries) {
    try {
      const output = execFileSync(binary, ["ls-files"], { encoding: "utf8" });
      const files = output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (files.length > 0) {
        return files;
      }
    } catch {
      // Try next git command.
    }
  }

  return [];
}

function collectRepositoryFiles(rootDir) {
  const skipDirs = new Set([
    ".git",
    "node_modules",
    ".next",
    "coverage",
    "build",
    "out",
    ".vercel",
  ]);
  const files = [];

  function walk(currentDir) {
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        walk(path.join(currentDir, entry.name));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, absolutePath);
      const normalizedRelativePath = relativePath.replace(/\\/g, "/");

      // Avoid local environment files in fallback mode.
      // We keep .env.example because it's a tracked template by convention.
      if (normalizedRelativePath.startsWith(".env") && normalizedRelativePath !== ".env.example") {
        continue;
      }

      try {
        const stats = statSync(absolutePath);
        if (stats.size > 2 * 1024 * 1024) {
          continue;
        }
      } catch {
        continue;
      }

      files.push(relativePath);
    }
  }

  walk(rootDir);
  return files;
}

function isPlaceholderSecret(value) {
  const normalized = value.toLowerCase();
  if (normalized.includes("...")) return true;
  if (normalized.endsWith("_123")) return true;
  if (normalized.includes("user:password@")) return true;
  if (normalized.includes("username:password@")) return true;
  if (normalized.includes("user:pass@")) return true;
  if (normalized.includes("your-")) return true;
  if (normalized.includes("example")) return true;
  if (normalized.includes("placeholder")) return true;
  return false;
}

function printSummary() {
  console.log("[deploy-check] Running deployment safety checks...");

  validateCoreEnv();
  validateStripeMode();
  validateOperationalEnv();
  scanForTrackedSecrets();

  for (const warning of warnings) {
    console.warn(`[deploy-check] WARN: ${warning}`);
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[deploy-check] FAIL: ${failure}`);
    }
    console.error(`[deploy-check] FAILED with ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  console.log("[deploy-check] PASS: all blocking deployment checks passed.");
}

printSummary();
