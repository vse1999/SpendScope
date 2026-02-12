import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { trackEvent } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

function areTestEndpointsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_ENDPOINTS === "true"
  );
}

/**
 * Test endpoint to verify Sentry is working
 * GET /api/test-sentry - Test message
 * POST /api/test-sentry - Test error capture
 */
export async function GET(): Promise<NextResponse> {
  if (!areTestEndpointsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Track a test event
  trackEvent("sentry_test_event", {
    endpoint: "/api/test-sentry",
    method: "GET",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: "Sentry test event tracked. Check your Sentry dashboard.",
    sentry: {
      configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled:
        process.env.NODE_ENV === "production" ||
        process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true",
    },
  });
}

export async function POST(): Promise<NextResponse> {
  if (!areTestEndpointsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Simulate an error
    throw new Error("Test error from SpendScope - this is expected!");
  } catch (error) {
    // Capture the error in Sentry
    Sentry.captureException(error, {
      tags: {
        test: true,
        endpoint: "/api/test-sentry",
      },
      extra: {
        note: "This is a test error to verify Sentry integration",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Test error captured. Check your Sentry dashboard.",
    });
  }
}
