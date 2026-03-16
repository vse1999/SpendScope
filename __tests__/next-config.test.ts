describe("next config security headers", () => {
  it("includes an enforced content security policy header", async () => {
    const nextConfigModule = await import("../next.config");
    const nextConfig = nextConfigModule.default;

    expect(nextConfig.headers).toBeDefined();

    const headerGroups = await nextConfig.headers?.();
    const rootHeaders = headerGroups?.find((entry) => entry.source === "/:path*");
    const cspHeader = rootHeaders?.headers.find(
      (header) => header.key === "Content-Security-Policy"
    );

    expect(cspHeader).toBeDefined();
    expect(cspHeader?.value).toContain("default-src 'self'");
    expect(cspHeader?.value).toContain("object-src 'none'");
    expect(cspHeader?.value).toContain("frame-ancestors 'none'");
    expect(cspHeader?.value).toContain("connect-src 'self' https://*.ingest.sentry.io https://vitals.vercel-insights.com");
    expect(cspHeader?.value).not.toContain("Content-Security-Policy-Report-Only");
  });
});
