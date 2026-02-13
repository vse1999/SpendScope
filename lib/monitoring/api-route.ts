interface ApiRouteContext {
  requestId: string;
  route: string;
  method: string;
}

function createRandomRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createApiRouteContext(request: Request, route: string): ApiRouteContext {
  const inboundRequestId = request.headers.get("x-request-id");
  return {
    requestId: inboundRequestId ?? createRandomRequestId(),
    route,
    method: request.method,
  };
}

export function withRequestIdHeader<T extends Response>(
  response: T,
  context: Pick<ApiRouteContext, "requestId">
): T {
  response.headers.set("x-request-id", context.requestId);
  return response;
}

function normalizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { name: "UnknownError", message: String(error) };
}

export function logApiInfo(
  message: string,
  context: ApiRouteContext,
  details?: Record<string, unknown>
): void {
  console.info(
    JSON.stringify({
      level: "info",
      message,
      ...context,
      details: details ?? {},
      timestamp: new Date().toISOString(),
    })
  );
}

export function logApiError(
  message: string,
  error: unknown,
  context: ApiRouteContext,
  details?: Record<string, unknown>
): void {
  const normalizedError = normalizeError(error);
  console.error(
    JSON.stringify({
      level: "error",
      message,
      ...context,
      error: normalizedError,
      details: details ?? {},
      timestamp: new Date().toISOString(),
    })
  );
}
