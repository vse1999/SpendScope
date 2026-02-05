/**
 * Stripe Test Cards for Development
 * @see https://stripe.com/docs/testing
 */

export const TEST_CARDS = {
  // Successful payments
  VISA_SUCCESS: "4242 4242 4242 4242",
  VISA_DEBIT: "4000 0566 5566 5556",
  MASTERCARD: "5555 5555 5555 4444",
  AMEX: "3782 822463 10005",

  // Declined payments
  DECLINE_GENERIC: "4000 0000 0000 0002",
  DECLINE_INSUFFICIENT: "4000 0000 0000 9995",
  DECLINE_EXPIRED: "4000 0000 0000 0069",
  DECLINE_INCORRECT_CVC: "4000 0000 0000 0127",
  DECLINE_PROCESSING_ERROR: "4000 0000 0000 0119",

  // Special scenarios
  REQUIRES_3D_SECURE: "4000 0027 6000 3184",
  ALWAYS_3D_SECURE: "4000 0084 0000 1280",
} as const

export const TEST_CARD_DEFAULTS = {
  EXPIRY: "12/30",
  CVC: "123",
  CVC_AMEX: "1234",
  ZIP: "12345",
} as const

/**
 * Get test card info for display
 */
export function getTestCardInfo() {
  return [
    {
      name: "Visa (Success)",
      number: TEST_CARDS.VISA_SUCCESS,
      expiry: TEST_CARD_DEFAULTS.EXPIRY,
      cvc: TEST_CARD_DEFAULTS.CVC,
      result: "✅ Payment succeeds",
    },
    {
      name: "Visa (Decline)",
      number: TEST_CARDS.DECLINE_GENERIC,
      expiry: TEST_CARD_DEFAULTS.EXPIRY,
      cvc: TEST_CARD_DEFAULTS.CVC,
      result: "❌ Card declined",
    },
    {
      name: "Visa (3D Secure)",
      number: TEST_CARDS.REQUIRES_3D_SECURE,
      expiry: TEST_CARD_DEFAULTS.EXPIRY,
      cvc: TEST_CARD_DEFAULTS.CVC,
      result: "🔐 Requires authentication",
    },
  ]
}

/**
 * Check if we're using test mode
 */
export function isTestMode(): boolean {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
  return publishableKey.startsWith("pk_test_")
}
