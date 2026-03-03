import { describe, it, expect, vi } from 'vitest'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { requireAuth, requireRole } from '@/lib/auth-guard'
import { auth } from '@/auth'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

describe('requireAuth', () => {
  it('retourne 401 si pas de session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await requireAuth()
    expect(res?.status).toBe(401)
  })

  it('retourne null si session valide', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'ADMIN', email: 'a@b.com', name: 'A' } })
    const res = await requireAuth()
    expect(res).toBeNull()
  })
})

describe('requireRole', () => {
  it('retourne 403 si rôle insuffisant', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'CONSULTANT', email: 'a@b.com', name: 'A' } })
    const res = await requireRole(['ADMIN', 'PM'])
    expect(res?.status).toBe(403)
  })

  it('retourne null si rôle autorisé', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'PM', email: 'a@b.com', name: 'A' } })
    const res = await requireRole(['ADMIN', 'PM'])
    expect(res).toBeNull()
  })

  it('retourne 401 si pas de session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await requireRole(['ADMIN'])
    expect(res?.status).toBe(401)
  })
})
