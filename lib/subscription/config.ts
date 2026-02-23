/**
 * Subscription and Feature Gating Configuration
 * Centralized configuration for plan limits and feature flags
 */

import { SubscriptionPlan } from "@prisma/client";

/**
 * Feature limits per subscription plan
 * Used by the Feature Gate Service to enforce limits
 */
export const FEATURE_LIMITS = {
  FREE: {
    name: "Free",
    maxUsers: 3,
    maxMonthlyExpenses: 100,
    maxCategories: 5,
    features: {
      analytics: false,
      export: false,
      teamInvites: false,
      unlimitedExpenses: false,
    },
  },
  PRO: {
    name: "Pro",
    maxUsers: Infinity,
    maxMonthlyExpenses: Infinity,
    maxCategories: Infinity,
    features: {
      analytics: true,
      export: true,
      teamInvites: true,
      unlimitedExpenses: true,
    },
  },
} as const;

export type SubscriptionPlanKey = keyof typeof FEATURE_LIMITS;

/**
 * Type for plan limits derived from FEATURE_LIMITS
 */
export type PlanLimits = typeof FEATURE_LIMITS[SubscriptionPlanKey];

/**
 * Type for feature flags within a plan
 */
export type PlanFeatures = PlanLimits["features"];

/**
 * Specific numeric limits that can be checked
 */
export interface NumericLimits {
  maxUsers: number;
  maxMonthlyExpenses: number;
  maxCategories: number;
}

/**
 * Get limits for a specific plan
 * @param plan - The subscription plan
 * @returns The plan limits configuration
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return FEATURE_LIMITS[plan];
}

/**
 * Get numeric limits for a specific plan
 * @param plan - The subscription plan
 * @returns The numeric limits (users, expenses, categories)
 */
export function getNumericLimits(plan: SubscriptionPlan): NumericLimits {
  const limits = FEATURE_LIMITS[plan];
  return {
    maxUsers: limits.maxUsers,
    maxMonthlyExpenses: limits.maxMonthlyExpenses,
    maxCategories: limits.maxCategories,
  };
}

/**
 * Check if a plan has a specific feature enabled
 * @param plan - The subscription plan
 * @param feature - The feature to check
 * @returns Whether the feature is enabled
 */
export function hasFeature(
  plan: SubscriptionPlan,
  feature: keyof PlanFeatures
): boolean {
  return FEATURE_LIMITS[plan].features[feature];
}

/**
 * Cache TTL configuration (in seconds)
 */
export const CACHE_TTL = {
  USAGE_METRICS: 60, // 1 minute
  SUBSCRIPTION_STATUS: 300, // 5 minutes
} as const;

/**
 * Optimistic locking configuration
 */
export const LOCK_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 100,
} as const;

/**
 * Feature types that can be gated
 */
export type GatedFeature = 
  | "expense"
  | "user"
  | "category"
  | "analytics"
  | "export"
  | "teamInvites";

/**
 * Map feature types to their limit keys
 */
export const FEATURE_LIMIT_KEYS: Record<GatedFeature, keyof NumericLimits | null> = {
  expense: "maxMonthlyExpenses",
  user: "maxUsers",
  category: "maxCategories",
  analytics: null,
  export: null,
  teamInvites: null,
} as const;
