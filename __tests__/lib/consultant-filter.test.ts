import { describe, it, expect } from 'vitest'
import { getConsultantFilter } from '@/lib/consultant-filter'

describe('getConsultantFilter', () => {
  it('retourne undefined pour ADMIN', () => {
    const session = { user: { id: '1', role: 'ADMIN', email: 'a@b.com', name: 'A' } } as any
    expect(getConsultantFilter(session)).toBeUndefined()
  })
  it('retourne undefined pour PM', () => {
    const session = { user: { id: '2', role: 'PM', email: 'b@c.com', name: 'B' } } as any
    expect(getConsultantFilter(session)).toBeUndefined()
  })
  it('retourne le consultantId pour CONSULTANT', () => {
    const session = { user: { id: '5', role: 'CONSULTANT', email: 'c@d.com', name: 'C' } } as any
    expect(getConsultantFilter(session)).toBe(5)
  })
  it('retourne undefined si session null', () => {
    expect(getConsultantFilter(null)).toBeUndefined()
  })
})
