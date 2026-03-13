import {
  getPricingCardClassName,
  getPricingFeatureIconClassName,
  getPricingFeatureIconContainerClassName,
} from "@/components/pricing/plan-card-styles";

describe("plan card styles", () => {
  it("uses a theme-aware premium surface for popular plans", () => {
    const className = getPricingCardClassName(true);

    expect(className).toContain("from-white");
    expect(className).toContain("via-indigo-50/80");
    expect(className).toContain("to-violet-100/90");
    expect(className).toContain("dark:from-indigo-950/30");
    expect(className).toContain("dark:via-slate-950");
    expect(className).toContain("dark:to-violet-950/30");
  });

  it("keeps the non-popular card surface neutral", () => {
    const className = getPricingCardClassName(false);

    expect(className).toContain("bg-card/50");
    expect(className).not.toContain("from-white");
  });

  it("keeps included feature icons readable in both themes", () => {
    expect(getPricingFeatureIconContainerClassName(true)).toContain("ring-indigo-200/70");
    expect(getPricingFeatureIconClassName(true)).toContain("text-indigo-600");
    expect(getPricingFeatureIconClassName(true)).toContain("dark:text-indigo-400");
  });
});
