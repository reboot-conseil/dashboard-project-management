import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AreaChartWrapper } from '@/components/charts/area-chart'

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const areas = [
  { key: 'ca', label: 'CA', color: '#2563eb' },
  { key: 'marge', label: 'Marge', color: '#16a34a' },
]

const data = [
  { mois: 'Jan', ca: 45000, marge: 18000 },
  { mois: 'Fév', ca: 52000, marge: 22000 },
  { mois: 'Mar', ca: 48000, marge: 19000 },
]

describe('AreaChartWrapper', () => {
  it('affiche le message vide quand data est vide', () => {
    render(<AreaChartWrapper data={[]} xKey="mois" areas={areas} />)
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
  })

  it('affiche un message vide personnalisé', () => {
    render(
      <AreaChartWrapper data={[]} xKey="mois" areas={areas} emptyMessage="Pas de tendances" />
    )
    expect(screen.getByText('Pas de tendances')).toBeInTheDocument()
  })

  it('affiche le container quand data est présent', () => {
    render(<AreaChartWrapper data={data} xKey="mois" areas={areas} />)
    expect(screen.getByTestId('area-chart-container')).toBeInTheDocument()
  })

  it('ne plante pas avec une seule aire', () => {
    const singleArea = [{ key: 'ca', label: 'CA', color: '#2563eb' }]
    render(<AreaChartWrapper data={data} xKey="mois" areas={singleArea} />)
    expect(screen.getByTestId('area-chart-container')).toBeInTheDocument()
  })

  it('ne plante pas quand data est undefined', () => {
    expect(() =>
      render(<AreaChartWrapper data={undefined as any} xKey="mois" areas={areas} />)
    ).not.toThrow()
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
  })
})
