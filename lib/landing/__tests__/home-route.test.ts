import type { Session } from "next-auth";

import { getHomeRedirectPath } from "@/lib/landing/home-route";

describe("getHomeRedirectPath", () => {
  it("returns dashboard path when a user session exists", () => {
    const session: Session = {
      expires: "2026-12-31T00:00:00.000Z",
      user: {
        id: "user-123",
        role: "ADMIN",
        name: "Owner",
        email: "owner@example.com",
        image: null,
      },
    };

    expect(getHomeRedirectPath(session)).toBe("/dashboard");
  });

  it("returns null when session is missing", () => {
    expect(getHomeRedirectPath(null)).toBeNull();
  });
});
