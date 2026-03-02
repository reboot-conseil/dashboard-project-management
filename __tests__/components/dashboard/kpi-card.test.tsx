import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { TrendingUp } from 'lucide-react'

const defaultProps = {
  title: "Chiffre d'affaires",
  value: '42 500 €',
  icon: <TrendingUp />,
}

describe('KpiCard', () => {
  it('affiche le titre', () => {
    render(<KpiCard {...defaultProps} />)
    expect(screen.getByText("Chiffre d'affaires")).toBeInTheDocument()
  })
  it('affiche la valeur', () => {
    render(<KpiCard {...defaultProps} />)
    expect(screen.getByText('42 500 €')).toBeInTheDocument()
  })
  it('affiche le subtitle quand fourni', () => {
    render(<KpiCard {...defaultProps} subtitle="Mois en cours" />)
    expect(screen.getByText('Mois en cours')).toBeInTheDocument()
  })
  it("n'affiche pas de subtitle quand absent", () => {
    render(<KpiCard {...defaultProps} />)
    expect(screen.queryByText('Mois en cours')).not.toBeInTheDocument()
  })
  it('affiche le trend positif avec signe +', () => {
    render(<KpiCard {...defaultProps} trend={{ value: 12, label: 'vs mois dernier' }} />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('vs mois dernier')).toBeInTheDocument()
  })
  it('affiche le trend négatif sans signe +', () => {
    render(<KpiCard {...defaultProps} trend={{ value: -5, label: 'vs mois dernier' }} />)
    expect(screen.getByText('-5%')).toBeInTheDocument()
  })
  it('affiche trend 0 sans signe +', () => {
    render(<KpiCard {...defaultProps} trend={{ value: 0, label: 'stable' }} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
  it("variante success ne lève pas d'erreur", () => {
    expect(() => render(<KpiCard {...defaultProps} variant="success" />)).not.toThrow()
  })
  it("variante danger ne lève pas d'erreur", () => {
    expect(() => render(<KpiCard {...defaultProps} variant="danger" />)).not.toThrow()
  })
})
