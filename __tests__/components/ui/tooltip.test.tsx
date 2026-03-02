import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip } from '@/components/ui/tooltip'

describe('Tooltip', () => {
  it('rend le children', () => {
    render(
      <Tooltip content="Info bulle">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument()
  })
  it('affiche le contenu du tooltip au hover', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="Info bulle">
        <button>Hover me</button>
      </Tooltip>
    )
    await user.hover(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Info bulle')).toBeInTheDocument()
  })
  it('masque le tooltip par défaut (pas de role=tooltip visible)', () => {
    render(
      <Tooltip content="Info bulle">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
