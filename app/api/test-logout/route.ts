import { NextResponse } from "next/server"

function getAuthCookieName(requestUrl: URL): string {
  return requestUrl.protocol === "https:"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
}

export async function GET(request: Request): Promise<NextResponse> {
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
