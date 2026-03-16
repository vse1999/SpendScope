import { renderToStaticMarkup } from "react-dom/server"

import DashboardLayout from "@/app/(dashboard)/layout"

const mockCookies = jest.fn()
const mockRequireDashboardRequestContext = jest.fn()

jest.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}))

jest.mock("@/lib/dashboard/request-context", () => ({
  requireDashboardRequestContext: () => mockRequireDashboardRequestContext(),
}))

jest.mock("@/components/notifications/notification-provider", () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock("@/components/dashboard/sidebar", () => ({
  DashboardSidebar: ({
    children,
  }: {
    children: React.ReactNode
    user: unknown
    defaultOpen: boolean
  }) => <div data-sidebar="mock">{children}</div>,
}))

jest.mock("@/components/dashboard/header", () => ({
  DashboardHeader: () => <div data-header="mock" />,
}))

describe("DashboardLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockResolvedValue({
      get: () => ({ value: "true" }),
    })
    mockRequireDashboardRequestContext.mockResolvedValue({
      user: {
        id: "user-1",
        role: "ADMIN",
        company: {
          id: "company-1",
          name: "Acme Inc",
        },
      },
    })
  })

  it("renders skip navigation and a main landmark", async () => {
    const element = await DashboardLayout({
      children: <div>Dashboard content</div>,
    })

    const html = renderToStaticMarkup(element)

    expect(html).toContain("Skip to main content")
    expect(html).toContain('id="dashboard-main-content"')
    expect(html).toContain("<main")
  })
})
