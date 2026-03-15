describe("next config security headers", () => {
  it("includes a report-only content security policy header", async () => {
    const nextConfigModule = await import("../next.config");
    const nextConfig = nextConfigModule.default;

    expect(nextConfig.headers).toBeDefined();

    const headerGroups = await nextConfig.headers?.();
    const rootHeaders = headerGroups?.find((entry) => entry.source === "/:path*");
    const cspHeader = rootHeaders?.headers.find(
      (header) => header.key === "Content-Security-Policy-Report-Only"
    );

    expect(cspHeader).toBeDefined();
    expect(cspHeader?.value).toContain("default-src 'self'");
    expect(cspHeader?.value).toContain("object-src 'none'");
    expect(cspHeader?.value).toContain("frame-ancestors 'none'");
  });
});
