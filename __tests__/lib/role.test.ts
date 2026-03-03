import { describe, it, expect } from 'vitest'

describe('Role enum', () => {
  it('les valeurs ADMIN, PM, CONSULTANT sont définies dans le type Prisma', async () => {
    const { Role } = await import('@prisma/client')
    expect(Role.ADMIN).toBe('ADMIN')
    expect(Role.PM).toBe('PM')
    expect(Role.CONSULTANT).toBe('CONSULTANT')
  })
})
