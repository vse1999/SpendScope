import { POST } from "../checkout/route";

const mockAuth = jest.fn();
const mockPrismaUserFindUnique = jest.fn();
const mockPrismaSubscriptionFindUnique = jest.fn();
const mockPrismaSubscriptionUpsert = jest.fn();
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
      upsert: (...args: unknown[]) => mockPrismaSubscriptionUpsert(...args),
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
    mockPrismaSubscriptionUpsert.mockResolvedValue({
      companyId: "company-1",
      stripeCustomerId: "cus_new",
    });
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

  it("returns 409 when company already has an active subscription", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@company.com",
      },
    });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      company: { id: "company-1", name: "Acme" },
    });
    mockPrismaSubscriptionFindUnique.mockResolvedValue({
      companyId: "company-1",
      status: "ACTIVE",
      stripeSubId: "sub_123",
      stripeCustomerId: "cus_123",
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      headers: {
        "x-request-id": "req-checkout-active-sub-1",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Company already has an active subscription" });
    expect(response.headers.get("x-request-id")).toBe("req-checkout-active-sub-1");
    expect(mockStripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("recreates customer and retries checkout when stored customer is missing in Stripe", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@company.com",
      },
    });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      company: { id: "company-1", name: "Acme" },
    });
    mockPrismaSubscriptionFindUnique.mockResolvedValue({
      companyId: "company-1",
      status: "CANCELED",
      stripeSubId: null,
      stripeCustomerId: "cus_stale",
    });
    mockStripeCustomerCreate.mockResolvedValue({
      id: "cus_recreated",
    });
    mockStripeCheckoutCreate
      .mockRejectedValueOnce(new Error("No such customer: 'cus_stale'"))
      .mockResolvedValueOnce({ url: "https://checkout.stripe.com/c/pay/cs_test_new" });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      headers: {
        "x-request-id": "req-checkout-recreate-1",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_new" });
    expect(response.headers.get("x-request-id")).toBe("req-checkout-recreate-1");
    expect(mockStripeCustomerCreate).toHaveBeenCalledTimes(1);
    expect(mockPrismaSubscriptionUpsert).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      update: { stripeCustomerId: "cus_recreated" },
      create: {
        companyId: "company-1",
        stripeCustomerId: "cus_recreated",
      },
    });
    expect(mockStripeCheckoutCreate).toHaveBeenCalledTimes(2);
    expect(mockStripeCheckoutCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ customer: "cus_stale" })
    );
    expect(mockStripeCheckoutCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ customer: "cus_recreated" })
    );
  });

  it("creates customer and starts checkout when no customer is stored", async (): Promise<void> => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@company.com",
      },
    });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      company: { id: "company-1", name: "Acme" },
    });
    mockPrismaSubscriptionFindUnique.mockResolvedValue({
      companyId: "company-1",
      status: "CANCELED",
      stripeSubId: null,
      stripeCustomerId: null,
    });
    mockStripeCustomerCreate.mockResolvedValue({
      id: "cus_new",
    });
    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_fresh",
    });

    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_fresh" });
    expect(mockStripeCustomerCreate).toHaveBeenCalledTimes(1);
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new" })
    );
  });
});
