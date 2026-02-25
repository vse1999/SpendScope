"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps): React.JSX.Element {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        errorType: "global-error-boundary",
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <html>
      <body className="min-h-screen app-shell text-foreground">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            An unexpected error occurred. You can try again, or go back to the dashboard.
          </p>

          {error.digest ? (
            <p className="mt-4 text-xs text-muted-foreground/80">
              Error ID: {error.digest}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-gradient-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Go to dashboard
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

