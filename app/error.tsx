"use client";

import * as Sentry from "@sentry/nextjs";
import React, { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps): React.ReactElement {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error, {
      tags: {
        errorType: "segment-error-boundary",
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="min-h-100 app-shell flex items-center justify-center p-4">
      <div className="app-card-strong max-w-md w-full rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold tracking-tight">
          Something went wrong
        </h2>
        <p className="mt-3 text-muted-foreground">
          We&apos;ve encountered an error loading this section.
        </p>
        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-md bg-gradient-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95"
            type="button"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
