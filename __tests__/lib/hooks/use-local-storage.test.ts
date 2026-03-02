import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'

// localStorage n'est pas complètement implémenté dans ce contexte jsdom/vitest —
// on le remplace par un mock manuel fiable
const store: Record<string, string> = {}
const localStorageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock)
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('retourne la valeur par défaut si aucune entrée localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('lit la valeur sauvegardée au montage', async () => {
    localStorageMock.setItem('test-key', JSON.stringify('saved'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    await waitFor(() => {
      expect(result.current[0]).toBe('saved')
    })
  })

  it('écrit dans localStorage quand setValue est appelé', async () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    await act(async () => {
      result.current[1]('new-value')
    })
    await waitFor(() => {
      expect(localStorageMock.getItem('test-key')).toBe(JSON.stringify('new-value'))
    })
  })

  it('supporte les valeurs objet (JSON)', async () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { a: 1 }))
    await act(async () => {
      result.current[1]({ a: 2, b: 3 })
    })
    expect(result.current[0]).toEqual({ a: 2, b: 3 })
  })

  it('remove() supprime la clé et remet la valeur par défaut', async () => {
    localStorageMock.setItem('test-key', JSON.stringify('saved'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    await waitFor(() => {
      expect(result.current[0]).toBe('saved')
    })
    await act(async () => {
      result.current[2]()
    })
    expect(result.current[0]).toBe('default')
    expect(localStorageMock.getItem('test-key')).toBeNull()
  })

  it('gère gracieusement un JSON invalide (retourne la valeur par défaut)', async () => {
    localStorageMock.setItem('test-key', 'NOT-VALID-JSON{{{')
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    await waitFor(() => {
      expect(result.current[0]).toBe('default')
    })
  })
})
