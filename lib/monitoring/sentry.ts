import * as Sentry from "@sentry/nextjs";

/**
 * Track a custom event in Sentry
 * Use this for business events you want to track alongside errors
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  Sentry.captureMessage(eventName, {
    level: "info",
    extra: properties,
    tags: {
      type: "business-event",
    },
  });
}

/**
 * Track an error with additional context
 * Use this instead of console.error for production errors
 */
export function trackError(
  error: Error,
  context?: Record<string, unknown>
): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Set user context for all subsequent events
 * Call this when a user logs in
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  companyId?: string;
  plan?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Set additional context as tags for filtering
  if (user.companyId) {
    Sentry.setTag("companyId", user.companyId);
  }
  if (user.plan) {
    Sentry.setTag("plan", user.plan);
  }
}

/**
 * Clear user context on logout
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
  Sentry.setTag("companyId", "");
  Sentry.setTag("plan", "");
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs help trace the steps leading to an error
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level?: Sentry.SeverityLevel,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Start a performance transaction
 * Useful for tracking custom operations
 */
export function startTransaction(
  name: string,
  op: string
): ReturnType<typeof Sentry.startInactiveSpan> | null {
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Monitor an async function for performance and errors
 */
export async function monitorAsync<T>(
  operationName: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const span = startTransaction(operationName, "custom.operation");

  try {
    addBreadcrumb(`Starting: ${operationName}`, "monitoring", "info", context);
    const result = await fn();
    addBreadcrumb(`Completed: ${operationName}`, "monitoring", "info");
    return result;
  } catch (error) {
    addBreadcrumb(
      `Failed: ${operationName}`,
      "monitoring",
      "error",
      context
    );
    trackError(error instanceof Error ? error : new Error(String(error)), {
      operation: operationName,
      ...context,
    });
    throw error;
  } finally {
    if (span) {
      span.end();
    }
  }
}
