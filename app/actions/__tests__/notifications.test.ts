import { getUserNotifications } from "@/app/actions/notifications";

const mockAuth = jest.fn();
const mockNotificationFindMany = jest.fn();
const mockUserFindMany = jest.fn();

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: (...args: unknown[]) => mockNotificationFindMany(...args),
    },
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
  },
}));

describe("getUserNotifications role-audit message formatting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("formats role-audit message for the actor as a human-readable message", async (): Promise<void> => {
    const now = new Date("2026-02-23T00:00:00.000Z");
    mockAuth.mockResolvedValue({
      user: { id: "admin-1" },
    });
    mockNotificationFindMany.mockResolvedValue([
      {
        id: "n1",
        type: "SUCCESS",
        title: "Team Role Changed",
        message: "ROLE_AUDIT_V1|admin-1|member-1|MEMBER|ADMIN",
        read: false,
        actionUrl: "/dashboard/team",
        createdAt: now,
      },
    ]);
    mockUserFindMany.mockResolvedValue([
      {
        id: "admin-1",
        name: "Jane Admin",
        email: "jane@example.com",
      },
      {
        id: "member-1",
        name: "John Member",
        email: "john@example.com",
      },
    ]);

    const result = await getUserNotifications();

    expect(result.success).toBe(true);
    expect(result.notifications).toEqual([
      expect.objectContaining({
        id: "n1",
        message: "You changed role for John Member from Member to Admin.",
      }),
    ]);
  });

  it("formats role-audit message for the target user", async (): Promise<void> => {
    const now = new Date("2026-02-23T00:00:00.000Z");
    mockAuth.mockResolvedValue({
      user: { id: "member-1" },
    });
    mockNotificationFindMany.mockResolvedValue([
      {
        id: "n2",
        type: "INFO",
        title: "Role Updated",
        message: "ROLE_AUDIT_V1|admin-1|member-1|MEMBER|ADMIN",
        read: false,
        actionUrl: "/dashboard/team",
        createdAt: now,
      },
    ]);
    mockUserFindMany.mockResolvedValue([
      {
        id: "admin-1",
        name: "Jane Admin",
        email: "jane@example.com",
      },
      {
        id: "member-1",
        name: "John Member",
        email: "john@example.com",
      },
    ]);

    const result = await getUserNotifications();

    expect(result.success).toBe(true);
    expect(result.notifications).toEqual([
      expect.objectContaining({
        id: "n2",
        message: "Jane Admin changed your role from Member to Admin.",
      }),
    ]);
  });

  it("keeps regular notification messages unchanged", async (): Promise<void> => {
    const now = new Date("2026-02-23T00:00:00.000Z");
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockNotificationFindMany.mockResolvedValue([
      {
        id: "n3",
        type: "INFO",
        title: "Budget Alert",
        message: "Budget threshold exceeded by 12%.",
        read: false,
        actionUrl: "/dashboard/expenses",
        createdAt: now,
      },
    ]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await getUserNotifications();

    expect(result.success).toBe(true);
    expect(result.notifications).toEqual([
      expect.objectContaining({
        id: "n3",
        message: "Budget threshold exceeded by 12%.",
      }),
    ]);
  });
});
