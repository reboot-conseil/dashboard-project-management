import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetCard } from '@/components/projets/budget-card'

const defaultProps = {
  budgetNum: 100_000,
  budgetConsomme: 60_000,
  coutReel: 40_000,
  marge: 20_000,
}

describe('BudgetCard', () => {
  it('affiche le titre "Analyse Budgétaire"', () => {
    render(<BudgetCard {...defaultProps} />)
    expect(screen.getByText('Analyse Budgétaire')).toBeInTheDocument()
  })

  it('affiche le CA facturable', () => {
    render(<BudgetCard {...defaultProps} />)
    // 60 000 € affiché
    expect(screen.getByTestId('budget-ca')).toHaveTextContent('60')
  })

  it('affiche le coût réel', () => {
    render(<BudgetCard {...defaultProps} />)
    expect(screen.getByTestId('budget-cout')).toHaveTextContent('40')
  })

  it('affiche la marge brute positive', () => {
    render(<BudgetCard {...defaultProps} />)
    expect(screen.getByTestId('budget-marge')).toHaveTextContent('20')
  })

  it('affiche le reste budget', () => {
    render(<BudgetCard {...defaultProps} budgetConsomme={60_000} budgetNum={100_000} />)
    // reste = 40 000
    expect(screen.getByTestId('budget-reste')).toHaveTextContent('40')
  })

  it("n'affiche pas d'alerte si budget non dépassé", () => {
    render(<BudgetCard {...defaultProps} />)
    expect(screen.queryByTestId('budget-alerte')).not.toBeInTheDocument()
  })

  it("affiche l'alerte si budget dépassé", () => {
    render(
      <BudgetCard
        {...defaultProps}
        budgetNum={50_000}
        budgetConsomme={60_000}
      />
    )
    expect(screen.getByTestId('budget-alerte')).toBeInTheDocument()
    expect(screen.getByText('Budget dépassé !')).toBeInTheDocument()
  })

  it('affiche la barre de budget', () => {
    render(<BudgetCard {...defaultProps} />)
    expect(screen.getByTestId('budget-bar')).toBeInTheDocument()
  })

  it("n'affiche pas la barre coût si coutReel = 0", () => {
    render(<BudgetCard {...defaultProps} coutReel={0} />)
    expect(screen.queryByTestId('budget-bar-cout')).not.toBeInTheDocument()
  })

  it("n'affiche pas la barre marge si marge <= 0", () => {
    render(<BudgetCard {...defaultProps} marge={0} />)
    expect(screen.queryByTestId('budget-bar-marge')).not.toBeInTheDocument()
  })

  it('affiche la barre coût si coutReel > 0', () => {
    render(<BudgetCard {...defaultProps} />)
    expect(screen.getByTestId('budget-bar-cout')).toBeInTheDocument()
  })

  it('affiche la barre marge si marge > 0', () => {
    render(<BudgetCard {...defaultProps} />)
    expect(screen.getByTestId('budget-bar-marge')).toBeInTheDocument()
  })

  it('reste budget = 0 si consommation = budget', () => {
    render(
      <BudgetCard
        {...defaultProps}
        budgetNum={100_000}
        budgetConsomme={100_000}
      />
    )
    expect(screen.getByTestId('budget-reste')).toHaveTextContent('0')
  })
})
