import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/auth', () => ({
  auth: vi.fn(() => ({ user: { id: '1', role: 'ADMIN', name: 'Admin', email: 'admin@co.com' } })),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    consultant: {
      findMany: vi.fn(() => [
        { id: 1, nom: 'Alice', email: 'alice@co.com', role: 'CONSULTANT', actif: true, password: 'hash' },
      ]),
    },
  },
}))

import AdminUsersPage from '@/app/admin/users/page'

describe('AdminUsersPage', () => {
  it('affiche le titre Gestion des utilisateurs', async () => {
    const page = await AdminUsersPage()
    render(page)
    expect(screen.getByRole('heading', { name: /gestion des utilisateurs/i })).toBeInTheDocument()
  })
})
