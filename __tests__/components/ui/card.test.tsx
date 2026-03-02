import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'

describe('Card', () => {
  it('rend avec les classes de base', () => {
    const { container } = render(<Card />)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('rounded-lg', 'border', 'border-border', 'bg-card')
  })
  it('accepte un className personnalisé', () => {
    const { container } = render(<Card className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
  it('variante glass ajoute la classe glass', () => {
    const { container } = render(<Card variant="glass" />)
    expect(container.firstChild).toHaveClass('glass')
  })
  it('sans variante, pas de classe glass', () => {
    const { container } = render(<Card />)
    expect(container.firstChild).not.toHaveClass('glass')
  })
})

describe('CardHeader', () => {
  it('rend les children', () => {
    render(<CardHeader><span>Header</span></CardHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  it('rend le titre', () => {
    render(<CardTitle>Mon Titre</CardTitle>)
    expect(screen.getByText('Mon Titre')).toBeInTheDocument()
  })
})

describe('CardContent', () => {
  it('rend les children', () => {
    render(<CardContent><p>Contenu</p></CardContent>)
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })
})

describe('CardDescription', () => {
  it('a la classe text-muted-foreground', () => {
    const { container } = render(<CardDescription>Desc</CardDescription>)
    expect(container.firstChild).toHaveClass('text-muted-foreground')
  })
})
