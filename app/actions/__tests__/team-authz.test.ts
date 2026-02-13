import { UserRole } from "@prisma/client";
import { getTeamRoleAuditLog, updateTeamMemberRole } from "@/app/actions/team";
import type { CurrentUserContext } from "@/lib/invitations/types";

const mockAuth = jest.fn();
const mockGetCurrentUserContext = jest.fn();
const mockUpdateCompanyMemberRole = jest.fn();
const mockGetRecentTeamRoleAudits = jest.fn();

jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/app/actions/notifications", () => ({
  createNotification: jest.fn(),
}));

jest.mock("@/lib/invitations/service", () => ({
  acceptInvitationByToken: jest.fn(),
  cancelPendingInvitation: jest.fn(),
  getCurrentUserContext: (...args: unknown[]) => mockGetCurrentUserContext(...args),
  getInvitationPreviewByToken: jest.fn(),
  getRecentTeamRoleAudits: (...args: unknown[]) => mockGetRecentTeamRoleAudits(...args),
  getTeamMembersForCompany: jest.fn(),
  inviteUserToCompany: jest.fn(),
  listPendingInvitations: jest.fn(),
  resendPendingInvitation: jest.fn(),
  updateCompanyMemberRole: (...args: unknown[]) => mockUpdateCompanyMemberRole(...args),
}));

function createCurrentUserContext(
  overrides: Partial<CurrentUserContext> = {}
): CurrentUserContext {
  return {
    id: "user-1",
    role: UserRole.ADMIN,
    companyId: "company-1",
    name: "Admin User",
    email: "admin@company.com",
    ...overrides,
  };
}

describe("team actions authz", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unauthorized for role audits when not authenticated", async (): Promise<void> => {
    mockAuth.mockResolvedValue(null);

    const result = await getTeamRoleAuditLog();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
    expect(mockGetRecentTeamRoleAudits).not.toHaveBeenCalled();
  });

  it("returns unauthorized for role audits when user is not admin", async (): Promise<void> => {
    mockAuth.mockResolvedValue({ user: { id: "member-1" } });
    mockGetCurrentUserContext.mockResolvedValue(
      createCurrentUserContext({ id: "member-1", role: UserRole.MEMBER })
    );

    const result = await getTeamRoleAuditLog();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
      expect(result.error).toContain("Only admins");
    }
    expect(mockGetRecentTeamRoleAudits).not.toHaveBeenCalled();
  });

  it("returns unauthorized for role updates when not authenticated", async (): Promise<void> => {
    mockAuth.mockResolvedValue(null);

    const result = await updateTeamMemberRole("member-1", UserRole.ADMIN);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
    expect(mockUpdateCompanyMemberRole).not.toHaveBeenCalled();
  });

  it("updates role when authenticated admin", async (): Promise<void> => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockGetCurrentUserContext.mockResolvedValue(
      createCurrentUserContext({ id: "admin-1", role: UserRole.ADMIN })
    );
    mockUpdateCompanyMemberRole.mockResolvedValue({
      ok: true,
      message: "Member is now admin",
    });

    const result = await updateTeamMemberRole("member-1", UserRole.ADMIN);

    expect(result).toEqual({
      success: true,
      message: "Member is now admin",
    });
    expect(mockUpdateCompanyMemberRole).toHaveBeenCalledWith(
      expect.objectContaining({ id: "admin-1", role: UserRole.ADMIN }),
      "member-1",
      UserRole.ADMIN
    );
  });
});

