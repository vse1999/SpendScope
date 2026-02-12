/**
 * Stripe type extensions
 * 
 * These types extend the official Stripe types to include properties that exist
 * at runtime but may not be fully typed in the SDK version being used.
 */

import type Stripe from "stripe"

// Stripe subscription with current_period_end (exists at runtime)
export interface StripeSubscriptionWithPeriod extends Stripe.Subscription {
  current_period_end?: number
  current_period_start?: number
}

// Stripe invoice with subscription ID (subscription can be string or expanded object)
export interface StripeInvoiceWithSubscription extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription
}

// Helper to extract subscription ID from invoice
export function getSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice
): string | null {
  const sub = (invoice as StripeInvoiceWithSubscription).subscription
  if (typeof sub === "string") return sub
  if (typeof sub === "object" && sub !== null) return sub.id
  return null
}

// Re-export Stripe types for convenience
export type { Stripe }
