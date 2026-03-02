import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('vitest fonctionne', () => {
    expect(1 + 1).toBe(2)
  })
  it('jsdom est actif', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
  })
})
