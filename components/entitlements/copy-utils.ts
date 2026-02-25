const GENERIC_PLAN_RESTRICTION_PATTERNS: readonly RegExp[] = [
  /is not available on your current plan/i,
  /available on the pro plan/i,
];

export function isGenericPlanRestrictionReason(reason?: string): boolean {
  if (!reason) {
    return false;
  }

  const normalizedReason = reason.trim();
  if (normalizedReason.length === 0) {
    return false;
  }

  return GENERIC_PLAN_RESTRICTION_PATTERNS.some((pattern) => pattern.test(normalizedReason));
}
