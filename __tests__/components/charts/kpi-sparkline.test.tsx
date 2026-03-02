import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiSparkline } from '@/components/charts/kpi-sparkline'

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('KpiSparkline', () => {
  it('ne plante pas avec des données valides', () => {
    expect(() =>
      render(<KpiSparkline data={[10, 20, 15, 30, 25]} />)
    ).not.toThrow()
  })

  it('affiche le container quand data est présent', () => {
    render(<KpiSparkline data={[10, 20, 15]} />)
    expect(screen.getByTestId('kpi-sparkline')).toBeInTheDocument()
  })

  it('ne plante pas avec un seul point de donnée', () => {
    expect(() => render(<KpiSparkline data={[42]} />)).not.toThrow()
  })

  it('ne plante pas avec un tableau vide', () => {
    expect(() => render(<KpiSparkline data={[]} />)).not.toThrow()
  })
})
