export type DemoUserRole = "ADMIN" | "MEMBER"

export interface DemoUserDefinition {
  readonly name: string
  readonly email: string
  readonly role: DemoUserRole
}

const DEMO_FLAG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO === "true"

export const DEMO_LOGIN_PROVIDER_ID = "demo-guest"
export const DEMO_COMPANY_NAME = "DemoCorp"
export const DEMO_COMPANY_SLUG = "democorp"

export const DEMO_USERS = [
  {
    name: "Alex Johnson",
    email: "alex.johnson@democorp.com",
    role: "ADMIN",
  },
  {
    name: "Sarah Chen",
    email: "sarah.chen@democorp.com",
    role: "MEMBER",
  },
  {
    name: "Michael Brown",
    email: "michael.brown@democorp.com",
    role: "MEMBER",
  },
  {
    name: "Emily Davis",
    email: "emily.davis@democorp.com",
    role: "MEMBER",
  },
  {
    name: "James Wilson",
    email: "james.wilson@democorp.com",
    role: "MEMBER",
  },
] as const satisfies readonly DemoUserDefinition[]

export const DEMO_GUEST_EMAIL = DEMO_USERS[0].email
export const DEMO_USER_EMAILS = DEMO_USERS.map((user) => user.email)

export function isDemoEnabled(): boolean {
  return DEMO_FLAG_ENABLED
}

export function isDemoGuestEmail(email: string): boolean {
  return email.trim().toLowerCase() === DEMO_GUEST_EMAIL
}
