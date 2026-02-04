"use server";

import { auth } from "@/auth";

/**
 * Refresh the current session
 * This updates the JWT token with fresh data from the database
 * Useful after onboarding (joining/creating a company)
 */
export async function refreshSession() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return { error: "Not authenticated" };
    }
    
    // The session will be refreshed on next request
    // NextAuth will trigger the jwt callback with trigger: "update"
    return { success: true };
  } catch (error) {
    console.error("Failed to refresh session:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to refresh session",
    };
  }
}
