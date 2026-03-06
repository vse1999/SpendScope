import {
  getSocialImageTheme,
  resolveSocialImageVariant,
} from "@/lib/seo/social-preview";

describe("social preview helpers", () => {
  it("resolves known variants", () => {
    expect(resolveSocialImageVariant("dashboard")).toBe("dashboard");
    expect(resolveSocialImageVariant("ANALYTICS")).toBe("analytics");
  });

  it("falls back to home variant for invalid input", () => {
    expect(resolveSocialImageVariant(undefined)).toBe("home");
    expect(resolveSocialImageVariant(null)).toBe("home");
    expect(resolveSocialImageVariant("unknown")).toBe("home");
  });

  it("returns a complete theme object", () => {
    const theme = getSocialImageTheme("expenses");

    expect(theme.badgeText).toContain("SpendScope");
    expect(theme.title.length).toBeGreaterThan(0);
    expect(theme.description.length).toBeGreaterThan(0);
    expect(theme.accentStart).toMatch(/^#/);
    expect(theme.accentEnd).toMatch(/^#/);
  });
});
