import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration({
      // Additional replay configuration goes here
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.feedbackIntegration({
      // Customize feedback button
      colorScheme: "system",
    }),
  ],

  // Define how likely traces are sampled
  // Capture 100% in development, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Define how likely Replay events are sampled
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs
  // This is relative to the sample rate
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry
  debug: process.env.NODE_ENV === "development",

  // Enables capturing of original console.log messages in sentry
  enableLogs: true,

  // Only enable Sentry in production or if explicitly enabled in development
  enabled: process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true",

  // Environment tag
  environment: process.env.NODE_ENV,

  // Release version for tracking deployments
  release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",

  // Before sending an error, we can add extra context
  beforeSend(event) {
    // Don't send errors in development unless explicitly enabled
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "true") {
      return null;
    }
    return event;
  },
});
