import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import {
  getPeriodDates,
  getDefaultFilters,
  loadFilters,
  saveFilters,
  type PeriodeKey,
  type DashboardFiltersValue,
} from '@/components/dashboard/DashboardFilters'

// localStorage.clear() absent en jsdom/vitest — on utilise un mock manuel fiable
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

afterAll(() => vi.unstubAllGlobals())

// ── Helpers ──────────────────────────────────────────────────────────────
function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function dayDiff(dateDebut: string, dateFin: string): number {
  const ms = new Date(dateFin).getTime() - new Date(dateDebut).getTime()
  return Math.round(ms / (24 * 3600 * 1000))
}

// ── getPeriodDates ────────────────────────────────────────────────────────
describe('getPeriodDates', () => {
  it('today : dateDebut === dateFin, format YYYY-MM-DD', () => {
    const { dateDebut, dateFin } = getPeriodDates('today')
    expect(isISODate(dateDebut)).toBe(true)
    expect(dateDebut).toBe(dateFin)
  })

  it('week : exactement 6 jours d\'écart (lundi→dimanche)', () => {
    const { dateDebut, dateFin } = getPeriodDates('week')
    expect(isISODate(dateDebut)).toBe(true)
    expect(isISODate(dateFin)).toBe(true)
    expect(dayDiff(dateDebut, dateFin)).toBe(6)
  })

  it('month : dateDebut <= dateFin, premier jour du mois', () => {
    const { dateDebut, dateFin } = getPeriodDates('month')
    expect(dateDebut <= dateFin).toBe(true)
    expect(dateDebut.endsWith('-01')).toBe(true)
    expect(dayDiff(dateDebut, dateFin)).toBeGreaterThanOrEqual(27)
  })

  it('quarter : dateDebut < dateFin, écart ≥ 89 jours', () => {
    const { dateDebut, dateFin } = getPeriodDates('quarter')
    expect(dateDebut < dateFin).toBe(true)
    expect(dayDiff(dateDebut, dateFin)).toBeGreaterThanOrEqual(89)
  })

  it('year : dateDebut < dateFin, 1er janv → 31 déc', () => {
    const { dateDebut, dateFin } = getPeriodDates('year')
    expect(dateDebut).toMatch(/-01-01$/)
    expect(dateFin).toMatch(/-12-31$/)
    expect(dayDiff(dateDebut, dateFin)).toBeGreaterThanOrEqual(364)
  })

  it('custom (clé inconnue) : fallback mois en cours', () => {
    const { dateDebut, dateFin } = getPeriodDates('custom' as PeriodeKey)
    // fallback = startOfMonth → endOfMonth
    expect(dateDebut.endsWith('-01')).toBe(true)
    expect(dateDebut <= dateFin).toBe(true)
  })
})

// ── getDefaultFilters ─────────────────────────────────────────────────────
describe('getDefaultFilters', () => {
  it('retourne projetId = "all" et periode = defaultPeriode', () => {
    const f = getDefaultFilters('week')
    expect(f.projetId).toBe('all')
    expect(f.periode).toBe('week')
    expect(isISODate(f.dateDebut)).toBe(true)
    expect(isISODate(f.dateFin)).toBe(true)
  })

  it('utilise "week" comme période par défaut quand non fourni', () => {
    const f = getDefaultFilters()
    expect(f.periode).toBe('week')
  })
})

// ── loadFilters ───────────────────────────────────────────────────────────
describe('loadFilters', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('retourne les valeurs par défaut si rien dans localStorage', () => {
    const f = loadFilters('test-key', 'month')
    expect(f.periode).toBe('month')
    expect(f.projetId).toBe('all')
  })

  it('retourne les filtres sauvegardés si valides', () => {
    const saved: DashboardFiltersValue = {
      periode: 'quarter',
      dateDebut: '2026-01-01',
      dateFin: '2026-03-31',
      projetId: '42',
    }
    localStorageMock.setItem('test-key', JSON.stringify(saved))
    const f = loadFilters('test-key', 'week')
    expect(f.periode).toBe('quarter')
    expect(f.projetId).toBe('42')
    expect(f.dateDebut).toBe('2026-01-01')
  })

  it('retourne les valeurs par défaut si JSON invalide', () => {
    localStorageMock.setItem('test-key', 'INVALID{{{')
    const f = loadFilters('test-key', 'month')
    expect(f.periode).toBe('month')
  })

  it('retourne les valeurs par défaut si champs obligatoires manquants', () => {
    localStorageMock.setItem('test-key', JSON.stringify({ projetId: 'all' })) // sans periode, dateDebut, dateFin
    const f = loadFilters('test-key', 'year')
    expect(f.periode).toBe('year')
  })
})

// ── saveFilters ───────────────────────────────────────────────────────────
describe('saveFilters', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('écrit le filtre sérialisé en JSON dans localStorage', () => {
    const filters: DashboardFiltersValue = {
      periode: 'week',
      dateDebut: '2026-02-23',
      dateFin: '2026-03-01',
      projetId: 'all',
    }
    saveFilters('save-key', filters)
    const raw = localStorageMock.getItem('save-key')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.periode).toBe('week')
    expect(parsed.projetId).toBe('all')
  })

  it('écrase la valeur existante', () => {
    const initial: DashboardFiltersValue = {
      periode: 'month', dateDebut: '2026-03-01', dateFin: '2026-03-31', projetId: 'all',
    }
    const updated: DashboardFiltersValue = {
      periode: 'year', dateDebut: '2026-01-01', dateFin: '2026-12-31', projetId: '5',
    }
    saveFilters('save-key', initial)
    saveFilters('save-key', updated)
    const parsed = JSON.parse(localStorageMock.getItem('save-key')!)
    expect(parsed.periode).toBe('year')
    expect(parsed.projetId).toBe('5')
  })
})
