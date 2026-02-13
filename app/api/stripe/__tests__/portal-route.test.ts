import { POST } from "../portal/route";

const mockAuth = jest.fn();
const mockPrismaUserFindUnique = jest.fn();
const mockStripePortalCreate = jest.fn();
const mockIsBillingEnabled = jest.fn();

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/stripe/config", () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockStripePortalCreate(...args),
      },
    },
  },
  isBillingEnabled: () => mockIsBillingEnabled(),
}));

describe("POST /api/stripe/portal authz", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBillingEnabled.mockReturnValue(true);
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockAuth.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/stripe/portal", {
      method: "POST",
      headers: {
        "x-request-id": "req-portal-authz-1",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Not authenticated" });
    expect(response.headers.get("x-request-id")).toBe("req-portal-authz-1");
  });

  it("returns 403 when user is not admin", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "member-1",
      },
    });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "member-1",
      role: "MEMBER",
      company: {
        id: "company-1",
        subscription: {
          stripeCustomerId: "cus_123",
        },
      },
    });

    const request = new Request("http://localhost:3000/api/stripe/portal", {
      method: "POST",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Only admins can manage billing" });
    expect(mockStripePortalCreate).not.toHaveBeenCalled();
  });
});

