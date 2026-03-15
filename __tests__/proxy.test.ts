type MockResponse =
  | { kind: "next" }
  | { kind: "redirect"; location: string }
  | { kind: "json"; body: unknown; status: number };

const mockNextResponse = {
  next: jest.fn<MockResponse, []>(() => ({ kind: "next" })),
  redirect: jest.fn<MockResponse, [URL]>((url) => ({ kind: "redirect", location: url.toString() })),
  json: jest.fn<MockResponse, [unknown, { status: number }]>((body, init) => ({
    kind: "json",
    body,
    status: init.status,
  })),
};

jest.mock("next-auth", () => ({
  __esModule: true,
  default: () => ({
    auth: (callback: (request: unknown) => unknown) => callback,
  }),
}));

jest.mock("next/server", () => ({
  NextResponse: mockNextResponse,
}));

function createRequest(pathname: string, options?: { auth?: unknown }): {
  auth?: unknown;
  nextUrl: { pathname: string };
  url: string;
} {
  return {
    auth: options?.auth,
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
  };
}

describe("proxy auth behavior", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "test";
  });

  it("returns 401 JSON for unauthenticated protected API requests", async (): Promise<void> => {
    const proxyModule = await import("../proxy");
    const proxyHandler = proxyModule.default as unknown as (request: unknown) => MockResponse;

    const response = proxyHandler(createRequest("/api/stripe/portal"));

    expect(response).toEqual({
      kind: "json",
      body: { error: "Not authenticated" },
      status: 401,
    });
  });

  it("redirects unauthenticated page requests to /login", async (): Promise<void> => {
    const proxyModule = await import("../proxy");
    const proxyHandler = proxyModule.default as unknown as (request: unknown) => MockResponse;

    const response = proxyHandler(createRequest("/dashboard"));

    expect(response).toEqual({
      kind: "redirect",
      location: "http://localhost:3000/login",
    });
  });

  it("allows public API auth routes without authentication", async (): Promise<void> => {
    const proxyModule = await import("../proxy");
    const proxyHandler = proxyModule.default as unknown as (request: unknown) => MockResponse;

    const response = proxyHandler(createRequest("/api/auth/session"));

    expect(response).toEqual({ kind: "next" });
  });

  it("allows authenticated protected API requests", async (): Promise<void> => {
    const proxyModule = await import("../proxy");
    const proxyHandler = proxyModule.default as unknown as (request: unknown) => MockResponse;

    const response = proxyHandler(createRequest("/api/stripe/portal", { auth: { user: { id: "user-1" } } }));

    expect(response).toEqual({ kind: "next" });
  });

  it("returns 404 for retired runtime test endpoints", async (): Promise<void> => {
    const proxyModule = await import("../proxy");
    const proxyHandler = proxyModule.default as unknown as (request: unknown) => MockResponse;

    expect(proxyHandler(createRequest("/api/test-login"))).toEqual({
      kind: "json",
      body: { error: "Not found" },
      status: 404,
    });

    expect(proxyHandler(createRequest("/api/test-logout"))).toEqual({
      kind: "json",
      body: { error: "Not found" },
      status: 404,
    });

    expect(proxyHandler(createRequest("/api/rate-limit-test"))).toEqual({
      kind: "json",
      body: { error: "Not found" },
      status: 404,
    });
  });
});
