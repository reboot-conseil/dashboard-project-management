const ADMIN_ONLY = ["/admin"]
const PM_PLUS_ONLY = ["/consultants", "/executive"]

export function getRedirectPath(
  user: { role: string } | null,
  pathname: string
): string | null {
  if (user && pathname === "/login") return "/"
  if (!user) return "/login"

  const { role } = user

  if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && role !== "ADMIN") {
    return "/"
  }

  if (PM_PLUS_ONLY.some((p) => pathname.startsWith(p)) && role === "CONSULTANT") {
    return "/"
  }

  return null
}
