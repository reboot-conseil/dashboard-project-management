import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAlertCount } from '@/lib/hooks/use-alert-count'

describe('useAlertCount', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retourne count=0 et loading=true initialement', () => {
    const { result } = renderHook(() => useAlertCount())
    expect(result.current.count).toBe(0)
    expect(result.current.loading).toBe(true)
  })

  it('retourne le bon count après fetch réussi', async () => {
    const { result } = renderHook(() => useAlertCount())
    await waitFor(() => {
      expect(result.current.count).toBe(3)
    })
    expect(result.current.loading).toBe(false)
  })

  it("retourne count=0 si la réponse n'est pas un tableau", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'not an array' }),
    } as Response)
    const { result } = renderHook(() => useAlertCount())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.count).toBe(0)
  })

  it('retourne count=0 si le fetch échoue', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useAlertCount())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.count).toBe(0)
  })

  it('retourne count=0 si res.ok est false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => [],
    } as Response)
    const { result } = renderHook(() => useAlertCount())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.count).toBe(0)
  })
})
