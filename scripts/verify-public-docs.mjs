#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const README_PATH = "README.md";
const PRIVATE_DOCS_PREFIX = "docs/private/";
const MARKDOWN_LINK_REGEX = /(?<!\!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const SKIPPED_LINK_PREFIXES = ["http://", "https://", "mailto:", "tel:", "#"];

function isSkippableLink(link) {
  return SKIPPED_LINK_PREFIXES.some((prefix) => link.startsWith(prefix));
}

function normalizeLinkTarget(rawTarget) {
  const target = rawTarget.trim().replace(/^<|>$/g, "");
  const [withoutHash] = target.split("#");
  return withoutHash;
}

function resolveRepoPath(linkTarget) {
  const normalized = linkTarget.replace(/^\/+/, "");
  return path.resolve(process.cwd(), normalized);
}

function getTrackedFiles() {
  try {
    const output = execFileSync("git", ["ls-files"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "unknown";
    console.warn(
      `Warning: unable to evaluate tracked-file checks because git execution failed (${code}).`
    );
    return [];
  }
}

function findReadmeLinkProblems(readmeContent) {
  const missingTargets = [];
  const privateTargets = [];
  const seenTargets = new Set();

  let match;
  while ((match = MARKDOWN_LINK_REGEX.exec(readmeContent)) !== null) {
    const rawTarget = match[1];
    if (!rawTarget || isSkippableLink(rawTarget)) {
      continue;
    }

    const linkTarget = normalizeLinkTarget(rawTarget);
    if (!linkTarget || seenTargets.has(linkTarget)) {
      continue;
    }
    seenTargets.add(linkTarget);

    const normalizedTarget = linkTarget.replace(/\\/g, "/");
    if (normalizedTarget.startsWith(PRIVATE_DOCS_PREFIX)) {
      privateTargets.push(linkTarget);
      continue;
    }

    const targetPath = resolveRepoPath(linkTarget);
    if (!existsSync(targetPath)) {
      missingTargets.push(linkTarget);
    }
  }

  return { missingTargets, privateTargets };
}

function findTrackedPrivateMarkdown(trackedFiles) {
  return trackedFiles.filter(
    (file) =>
      file.replace(/\\/g, "/").startsWith(PRIVATE_DOCS_PREFIX) &&
      file.toLowerCase().endsWith(".md")
  );
}

function main() {
  const readmePath = path.resolve(process.cwd(), README_PATH);
  const readmeContent = readFileSync(readmePath, "utf8");
  const trackedFiles = getTrackedFiles();

  const { missingTargets, privateTargets } = findReadmeLinkProblems(readmeContent);
  const trackedPrivateMarkdown = findTrackedPrivateMarkdown(trackedFiles);

  const errors = [];

  if (missingTargets.length > 0) {
    errors.push(
      `README links to missing local targets:\n${missingTargets
        .map((target) => `- ${target}`)
        .join("\n")}`
    );
  }

  if (privateTargets.length > 0) {
    errors.push(
      `README links to private docs (disallowed):\n${privateTargets
        .map((target) => `- ${target}`)
        .join("\n")}`
    );
  }

  if (trackedPrivateMarkdown.length > 0) {
    errors.push(
      `Private markdown is tracked by git (disallowed):\n${trackedPrivateMarkdown
        .map((target) => `- ${target}`)
        .join("\n")}`
    );
  }

  if (errors.length > 0) {
    console.error("Public docs verification failed.\n");
    console.error(errors.join("\n\n"));
    process.exit(1);
  }

  console.log("Public docs verification passed.");
}

main();
