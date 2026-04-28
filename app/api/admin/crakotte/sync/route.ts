import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"

export async function POST() {
  const authError = await requireRole(["ADMIN"])
  if (authError) return authError

  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/sync/crakotte`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
