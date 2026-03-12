import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockUpdateMany, mockDelete, mockFindUnique, mockTransaction } = vi.hoisted(() => {
  const mockUpdateMany = vi.fn().mockResolvedValue({ count: 3 })
  const mockDelete = vi.fn().mockResolvedValue({})
  const mockFindUnique = vi.fn()
  const mockTransaction = vi.fn(async (fn: any) =>
    fn({
      activite: { updateMany: mockUpdateMany },
      consultant: { delete: mockDelete, findUnique: mockFindUnique },
    })
  )
  return { mockUpdateMany, mockDelete, mockFindUnique, mockTransaction }
})

vi.mock("@/lib/auth-guard", () => ({
  requireRole: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultant: { findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}))

import { POST } from "@/app/api/admin/consultants/merge/route"
import { NextRequest } from "next/server"

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/admin/consultants/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/admin/consultants/merge", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 400 if sourceId or targetId missing", async () => {
    const res = await POST(makeReq({ sourceId: 1 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 if sourceId === targetId", async () => {
    const res = await POST(makeReq({ sourceId: 5, targetId: 5 }))
    expect(res.status).toBe(400)
  })

  it("returns 404 if source consultant not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ sourceId: 99, targetId: 1 }))
    expect(res.status).toBe(404)
  })

  it("returns 400 if source has a real account (password set)", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 2, nom: "Jean", password: "hash", email: "jean@x.com" })
    const res = await POST(makeReq({ sourceId: 2, targetId: 1 }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/compte actif/)
  })

  it("migrates activités and deletes source on success", async () => {
    mockFindUnique
      .mockResolvedValueOnce({ id: 2, nom: "Jonathan", password: null, email: "_sans-email-123@noemail.local" })
      .mockResolvedValueOnce({ id: 1, nom: "Jonathan Braun" })
    const res = await POST(makeReq({ sourceId: 2, targetId: 1 }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.activitesMigrees).toBe(3)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { consultantId: 2 },
      data: { consultantId: 1 },
    })
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 2 } })
  })
})
