import { POST } from "../checkout/route";

const mockAuth = jest.fn();
const mockPrismaUserFindUnique = jest.fn();
const mockPrismaSubscriptionFindUnique = jest.fn();
const mockPrismaSubscriptionUpdate = jest.fn();
const mockStripeCustomerCreate = jest.fn();
const mockStripeCheckoutCreate = jest.fn();
const mockIsBillingEnabled = jest.fn();

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
    subscription: {
      findUnique: (...args: unknown[]) => mockPrismaSubscriptionFindUnique(...args),
      update: (...args: unknown[]) => mockPrismaSubscriptionUpdate(...args),
    },
  },
}));

jest.mock("@/lib/stripe/config", () => ({
  stripe: {
    customers: {
      create: (...args: unknown[]) => mockStripeCustomerCreate(...args),
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockStripeCheckoutCreate(...args),
      },
    },
  },
  isBillingEnabled: () => mockIsBillingEnabled(),
  PRICE_IDS: {
    PRO_MONTHLY: "price_test_pro",
  },
}));

describe("POST /api/stripe/checkout authz", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBillingEnabled.mockReturnValue(true);
  });

  it("returns 401 when not authenticated", async (): Promise<void> => {
    mockAuth.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      headers: {
        "x-request-id": "req-checkout-authz-1",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Not authenticated" });
    expect(response.headers.get("x-request-id")).toBe("req-checkout-authz-1");
  });

  it("returns 403 when user is not admin", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "member-1",
        email: "member@company.com",
      },
    });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "member-1",
      role: "MEMBER",
      company: { id: "company-1", name: "Acme" },
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Only admins can manage billing" });
    expect(mockStripeCheckoutCreate).not.toHaveBeenCalled();
  });
});

