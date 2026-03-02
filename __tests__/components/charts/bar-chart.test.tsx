import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BarChartWrapper } from '@/components/charts/bar-chart'

// Recharts utilise ResizeObserver — mock requis en jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const bars = [
  { key: 'heures', label: 'Heures', color: '#2563eb' },
]

const data = [
  { jour: 'Lun', heures: 6 },
  { jour: 'Mar', heures: 7.5 },
  { jour: 'Mer', heures: 8 },
]

describe('BarChartWrapper', () => {
  it('affiche le message vide quand data est vide', () => {
    render(<BarChartWrapper data={[]} xKey="jour" bars={bars} />)
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
  })

  it('affiche un message vide personnalisé', () => {
    render(
      <BarChartWrapper data={[]} xKey="jour" bars={bars} emptyMessage="Pas de données ce mois" />
    )
    expect(screen.getByText('Pas de données ce mois')).toBeInTheDocument()
  })

  it('affiche le container quand data est présent', () => {
    render(<BarChartWrapper data={data} xKey="jour" bars={bars} />)
    expect(screen.getByTestId('bar-chart-container')).toBeInTheDocument()
  })

  it('ne plante pas avec plusieurs barres', () => {
    const multiBars = [
      { key: 'heures', label: 'Heures', color: '#2563eb' },
      { key: 'ca', label: 'CA', color: '#7c3aed' },
    ]
    const multiData = [{ jour: 'Lun', heures: 6, ca: 500 }]
    render(<BarChartWrapper data={multiData} xKey="jour" bars={multiBars} />)
    expect(screen.getByTestId('bar-chart-container')).toBeInTheDocument()
  })

  it('ne plante pas quand data est undefined (fallback empty)', () => {
    expect(() =>
      render(<BarChartWrapper data={undefined as any} xKey="jour" bars={bars} />)
    ).not.toThrow()
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
  })
})
