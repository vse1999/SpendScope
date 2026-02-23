import { isGenericPlanRestrictionReason } from "../copy-utils";

describe("isGenericPlanRestrictionReason", () => {
  it("returns true for generic current-plan restriction copy", (): void => {
    expect(isGenericPlanRestrictionReason("analytics is not available on your current plan")).toBe(true);
  });

  it("returns true for generic pro-plan availability copy", (): void => {
    expect(isGenericPlanRestrictionReason("Advanced analytics is available on the Pro plan")).toBe(true);
  });

  it("returns false for specific user-facing guidance", (): void => {
    expect(
      isGenericPlanRestrictionReason("You have reached your monthly expense limit. Upgrade to continue.")
    ).toBe(false);
  });

  it("returns false for empty values", (): void => {
    expect(isGenericPlanRestrictionReason(undefined)).toBe(false);
    expect(isGenericPlanRestrictionReason("   ")).toBe(false);
  });
});
