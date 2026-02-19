#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SOURCE_ROOTS = ["app", "components", "hooks", "lib", "types"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const EXCLUDED_DIRS = new Set(["node_modules", ".next", "coverage", "__tests__"]);
const EXCLUDED_FILE_PATTERNS = [/\.d\.ts$/, /\.test\.[cm]?tsx?$/];

const EXPLICIT_ANY_PATTERNS = [
  /\bas\s+any\b/,
  /:\s*any\b/,
  /<\s*any\s*>/,
  /\bArray<\s*any\s*>/,
  /\bPromise<\s*any\s*>/,
  /\bReadonlyArray<\s*any\s*>/,
];

const ALLOWLIST = [
  {
    file: "components/analytics/monthly-trend-chart.tsx",
    contains: "as any",
    reason: "Recharts click state typing gap",
  },
  {
    file: "components/blocks/auth/test-login-form.tsx",
    contains: "as any",
    reason: "NextAuth signIn test helper typing gap",
  },
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function shouldSkipFile(relativeFilePath) {
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(relativeFilePath));
}

function isAllowlisted(relativeFilePath, lineText) {
  return ALLOWLIST.some(
    (entry) => entry.file === relativeFilePath && lineText.includes(entry.contains)
  );
}

function collectSourceFiles(startDir, output) {
  const entries = readdirSync(startDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(startDir, entry.name);
    const relativePath = normalizePath(path.relative(ROOT_DIR, absolutePath));

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      collectSourceFiles(absolutePath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (shouldSkipFile(relativePath)) {
      continue;
    }

    const extension = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(extension)) {
      continue;
    }

    try {
      const stats = statSync(absolutePath);
      if (stats.size > 1024 * 1024) {
        continue;
      }
    } catch {
      continue;
    }

    output.push({ absolutePath, relativePath });
  }
}

function hasExplicitAny(lineText) {
  return EXPLICIT_ANY_PATTERNS.some((pattern) => pattern.test(lineText));
}

function run() {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    const absoluteRoot = path.join(ROOT_DIR, root);
    try {
      collectSourceFiles(absoluteRoot, files);
    } catch {
      // Skip missing source roots.
    }
  }

  const violations = [];
  const allowlistHits = [];

  for (const file of files) {
    const content = readFileSync(file.absolutePath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((lineText, index) => {
      if (!hasExplicitAny(lineText)) {
        return;
      }

      if (isAllowlisted(file.relativePath, lineText)) {
        allowlistHits.push(`${file.relativePath}:${index + 1}`);
        return;
      }

      violations.push({
        file: file.relativePath,
        line: index + 1,
        code: lineText.trim(),
      });
    });
  }

  if (violations.length > 0) {
    console.error("[check:any] Found non-allowlisted explicit `any` usage:");
    for (const violation of violations) {
      console.error(
        `  - ${violation.file}:${violation.line} -> ${violation.code}`
      );
    }
    process.exit(1);
  }

  console.log(
    `[check:any] Passed. No new explicit any usage found. Allowlisted occurrences: ${allowlistHits.length}.`
  );

  const unusedAllowlistEntries = ALLOWLIST.filter(
    (entry) =>
      !allowlistHits.some((hit) => hit.startsWith(`${entry.file}:`))
  );

  if (unusedAllowlistEntries.length > 0) {
    console.warn("[check:any] Unused allowlist entries detected:");
    for (const entry of unusedAllowlistEntries) {
      console.warn(
        `  - ${entry.file} (${entry.reason})`
      );
    }
  }
}

run();
