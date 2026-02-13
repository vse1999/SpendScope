import { UserRole } from "@prisma/client";
import { getRecentTeamRoleAudits, updateCompanyMemberRole } from "../service";
import type { CurrentUserContext } from "../types";

const mockPrismaUserFindFirst = jest.fn();
const mockPrismaUserCount = jest.fn();
const mockPrismaUserUpdate = jest.fn();
const mockPrismaUserFindMany = jest.fn();
const mockPrismaNotificationFindMany = jest.fn();
const mockCreateNotification = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockPrismaUserFindFirst(...args),
      count: (...args: unknown[]) => mockPrismaUserCount(...args),
      update: (...args: unknown[]) => mockPrismaUserUpdate(...args),
      findMany: (...args: unknown[]) => mockPrismaUserFindMany(...args),
    },
    notification: {
      findMany: (...args: unknown[]) => mockPrismaNotificationFindMany(...args),
    },
  },
}));

jest.mock("@/app/actions/notifications", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

jest.mock("@/lib/subscription/feature-gate-service", () => ({
  checkFeatureLimit: jest.fn(),
}));

jest.mock("@/lib/email/invitations", () => ({
  sendTeamInvitationEmail: jest.fn(),
}));

function createCurrentUserContext(
  overrides: Partial<CurrentUserContext> = {}
): CurrentUserContext {
  return {
    id: "admin-1",
    role: UserRole.ADMIN,
    companyId: "company-1",
    name: "Admin User",
    email: "admin@company.com",
    ...overrides,
  };
}

describe("invitation service role governance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks role updates from non-admin users", async (): Promise<void> => {
    const currentUser = createCurrentUserContext({ role: UserRole.MEMBER });

    const result = await updateCompanyMemberRole(currentUser, "member-1", UserRole.ADMIN);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
    expect(mockPrismaUserFindFirst).not.toHaveBeenCalled();
  });

  it("blocks self role updates", async (): Promise<void> => {
    const currentUser = createCurrentUserContext();
    mockPrismaUserFindFirst.mockResolvedValue({
      id: currentUser.id,
      name: "Admin User",
      email: "admin@company.com",
      role: UserRole.ADMIN,
    });

    const result = await updateCompanyMemberRole(currentUser, currentUser.id, UserRole.MEMBER);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SELF_UPDATE");
    }
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("blocks last admin demotion", async (): Promise<void> => {
    const currentUser = createCurrentUserContext();
    mockPrismaUserFindFirst.mockResolvedValue({
      id: "admin-2",
      name: "Second Admin",
      email: "admin2@company.com",
      role: UserRole.ADMIN,
    });
    mockPrismaUserCount.mockResolvedValue(1);

    const result = await updateCompanyMemberRole(currentUser, "admin-2", UserRole.MEMBER);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("LAST_ADMIN");
    }
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("updates member role and writes role-change notifications", async (): Promise<void> => {
    const currentUser = createCurrentUserContext();
    mockPrismaUserFindFirst.mockResolvedValue({
      id: "member-1",
      name: "Team Member",
      email: "member@company.com",
      role: UserRole.MEMBER,
    });
    mockPrismaUserUpdate.mockResolvedValue({
      id: "member-1",
      name: "Team Member",
      email: "member@company.com",
    });
    mockCreateNotification.mockResolvedValue({ success: true });

    const result = await updateCompanyMemberRole(currentUser, "member-1", UserRole.ADMIN);

    expect(result.ok).toBe(true);
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { role: UserRole.ADMIN },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateNotification).toHaveBeenNthCalledWith(
      1,
      "member-1",
      expect.objectContaining({
        title: "Role Updated",
      })
    );
    expect(mockCreateNotification).toHaveBeenNthCalledWith(
      2,
      "admin-1",
      expect.objectContaining({
        title: "Team Role Changed",
        message: expect.stringMatching(/^ROLE_AUDIT_V1\|admin-1\|member-1\|MEMBER\|ADMIN$/),
      })
    );
  });

  it("returns parsed audit entries for current company admins", async (): Promise<void> => {
    const currentUser = createCurrentUserContext();
    const now = new Date("2026-02-13T10:00:00.000Z");

    mockPrismaUserFindMany.mockResolvedValue([
      {
        id: "admin-1",
        name: "Admin User",
        email: "admin@company.com",
        role: UserRole.ADMIN,
      },
      {
        id: "member-1",
        name: "Team Member",
        email: "member@company.com",
        role: UserRole.MEMBER,
      },
    ]);
    mockPrismaNotificationFindMany.mockResolvedValue([
      {
        id: "audit-1",
        message: "ROLE_AUDIT_V1|admin-1|member-1|MEMBER|ADMIN",
        createdAt: now,
      },
      {
        id: "audit-2",
        message: "invalid-audit-message",
        createdAt: now,
      },
    ]);

    const results = await getRecentTeamRoleAudits(currentUser);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: "audit-1",
      actorUserId: "admin-1",
      actorDisplayName: "Admin User",
      targetUserId: "member-1",
      targetDisplayName: "Team Member",
      fromRole: UserRole.MEMBER,
      toRole: UserRole.ADMIN,
      createdAt: now,
    });
  });
});
