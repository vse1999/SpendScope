#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL;
const smokeUseTestLogin = process.env.SMOKE_USE_TEST_LOGIN === "true";
const smokeE2EToken = process.env.SMOKE_E2E_TOKEN;

if (!baseUrl) {
  console.error("SMOKE_BASE_URL is required");
  process.exit(1);
}

function normalizeBaseUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

async function request(path, options = {}) {
  const response = await fetch(`${normalizedBaseUrl}${path}`, {
    redirect: "manual",
    ...options,
  });
  return response;
}

function ensureStatus(response, expectedStatuses, label) {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${label} expected status [${expectedStatuses.join(", ")}], received ${response.status}`);
  }
}

async function runUnauthenticatedChecks() {
  const loginResponse = await request("/login");
  ensureStatus(loginResponse, [200], "GET /login");
  console.log("[smoke] PASS GET /login");

  const teamResponse = await request("/dashboard/team");
  ensureStatus(teamResponse, [302, 303, 307, 308], "GET /dashboard/team (unauth redirect)");
  console.log("[smoke] PASS GET /dashboard/team redirects for unauthenticated user");

  const checkoutResponse = await request("/api/stripe/checkout", { method: "POST" });
  ensureStatus(checkoutResponse, [400, 401], "POST /api/stripe/checkout (unauth)");
  console.log("[smoke] PASS POST /api/stripe/checkout blocks unauthenticated user");

  const portalResponse = await request("/api/stripe/portal", { method: "POST" });
  ensureStatus(portalResponse, [400, 401], "POST /api/stripe/portal (unauth)");
  console.log("[smoke] PASS POST /api/stripe/portal blocks unauthenticated user");
}

async function runAuthenticatedChecksWithTestLogin() {
  const tokenQuery = smokeE2EToken ? `&token=${encodeURIComponent(smokeE2EToken)}` : "";
  const loginResponse = await request(`/api/test-login?seed=1${tokenQuery}`);
  ensureStatus(loginResponse, [302, 303, 307, 308], "GET /api/test-login");

  const sessionCookie = loginResponse.headers.get("set-cookie");
  if (!sessionCookie) {
    throw new Error("Test login did not set an auth session cookie");
  }

  const teamResponse = await request("/dashboard/team", {
    headers: {
      cookie: sessionCookie,
    },
  });
  ensureStatus(teamResponse, [200], "GET /dashboard/team (authenticated)");
  console.log("[smoke] PASS authenticated team dashboard access");

  const billingResponse = await request("/dashboard/billing", {
    headers: {
      cookie: sessionCookie,
    },
  });
  ensureStatus(billingResponse, [200], "GET /dashboard/billing (authenticated)");
  console.log("[smoke] PASS authenticated billing dashboard access");
}

async function main() {
  console.log(`[smoke] Running smoke checks against ${normalizedBaseUrl}`);
  await runUnauthenticatedChecks();

  if (smokeUseTestLogin) {
    await runAuthenticatedChecksWithTestLogin();
  } else {
    console.log("[smoke] Skipping authenticated smoke checks (SMOKE_USE_TEST_LOGIN is not true)");
  }

  console.log("[smoke] All checks passed");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[smoke] FAILED: ${message}`);
  process.exit(1);
});

