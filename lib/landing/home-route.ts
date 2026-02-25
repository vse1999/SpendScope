import type { Session } from "next-auth";

export function getHomeRedirectPath(
  session: Session | null
): "/dashboard" | null {
  if (session?.user) {
    return "/dashboard";
  }

  return null;
}
