import { Session } from "next-auth"

export function getConsultantFilter(session: Session | null): number | undefined {
  if (!session?.user) return undefined
  if (session.user.role === "CONSULTANT") {
    return parseInt(session.user.id, 10)
  }
  return undefined
}
