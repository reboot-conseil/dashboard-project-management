import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from '@/components/ui/spinner'

describe('Spinner', () => {
  it('rend un élément avec role="status"', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
  it('a un texte accessible "Chargement..."', () => {
    render(<Spinner />)
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })
  it('a la size md par défaut', () => {
    render(<Spinner />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('h-6', 'w-6')
  })
  it('accepte un className personnalisé sans écraser les classes de base', () => {
    render(<Spinner className="extra-class" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('animate-spin', 'rounded-full', 'extra-class')
  })
  it('accepte une size sm', () => {
    render(<Spinner size="sm" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('h-4')
  })
  it('accepte une size lg', () => {
    render(<Spinner size="lg" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('h-8')
  })
})
