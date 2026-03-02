import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('variante default a bg-primary', () => {
    const { container } = render(<Badge>Default</Badge>)
    expect(container.firstChild).toHaveClass('bg-primary')
  })
  it('variante secondary a bg-secondary', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    expect(container.firstChild).toHaveClass('bg-secondary')
  })
  it('variante destructive a bg-destructive', () => {
    const { container } = render(<Badge variant="destructive">Danger</Badge>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })
  it('variante success a bg-success', () => {
    const { container } = render(<Badge variant="success">Succès</Badge>)
    expect(container.firstChild).toHaveClass('bg-success')
  })
  it('variante warning a bg-warning', () => {
    const { container } = render(<Badge variant="warning">Attention</Badge>)
    expect(container.firstChild).toHaveClass('bg-warning')
  })
  it('variante outline a text-foreground', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    expect(container.firstChild).toHaveClass('text-foreground')
  })
  it('accepte des children texte', () => {
    const { container } = render(<Badge>Mon badge</Badge>)
    expect(container.firstChild).toHaveTextContent('Mon badge')
  })
})
