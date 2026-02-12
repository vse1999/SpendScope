import { NextResponse } from "next/server"

function areTestEndpointsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_ENDPOINTS === "true"
  )
}

function getAuthCookieName(requestUrl: URL): string {
  return requestUrl.protocol === "https:"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!areTestEndpointsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const url = new URL(request.url)
  const cookieName = getAuthCookieName(url)

  const response = NextResponse.redirect(new URL("/login", request.url))
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: url.protocol === "https:",
    maxAge: 0,
  })
  return response
}
