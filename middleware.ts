import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getRedirectPath } from "@/lib/middleware-utils"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const user = req.auth?.user ?? null

  const redirectTo = getRedirectPath(
    user ? { role: user.role as string } : null,
    pathname
  )

  if (redirectTo) {
    const url = req.nextUrl.clone()
    url.pathname = redirectTo
    if (redirectTo === "/login" && pathname !== "/login") {
      // Sanitise: only allow relative paths (starts with / but not //)
      const safeCallback = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/"
      url.searchParams.set("callbackUrl", safeCallback)
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
}
