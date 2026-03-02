import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('rend avec le texte correct', () => {
    render(<Button>Cliquer</Button>)
    expect(screen.getByRole('button', { name: 'Cliquer' })).toBeInTheDocument()
  })
  it('variante default a bg-primary', () => {
    const { container } = render(<Button>Test</Button>)
    expect(container.firstChild).toHaveClass('bg-primary')
  })
  it('variante destructive a bg-destructive', () => {
    const { container } = render(<Button variant="destructive">Supprimer</Button>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })
  it('variante outline a border border-border', () => {
    const { container } = render(<Button variant="outline">Outline</Button>)
    expect(container.firstChild).toHaveClass('border', 'border-border')
  })
  it("variante ghost n'a pas bg-primary", () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    expect(container.firstChild).not.toHaveClass('bg-primary')
  })
  it('size sm a h-9', () => {
    const { container } = render(<Button size="sm">Petit</Button>)
    expect(container.firstChild).toHaveClass('h-9')
  })
  it('disabled est inactif', () => {
    render(<Button disabled>Désactivé</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('appelle onClick quand cliqué', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Clic</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('ne déclenche pas onClick si disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Désactivé</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
