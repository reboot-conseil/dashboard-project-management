import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/layout/page-header'
import { FolderOpen } from 'lucide-react'

describe('PageHeader', () => {
  it('affiche le titre', () => {
    render(<PageHeader title="Projets" />)
    expect(screen.getByRole('heading', { name: 'Projets' })).toBeInTheDocument()
  })

  it('affiche le subtitle quand fourni', () => {
    render(<PageHeader title="Projets" subtitle="Gérer vos projets" />)
    expect(screen.getByText('Gérer vos projets')).toBeInTheDocument()
  })

  it("n'affiche pas de subtitle quand absent", () => {
    render(<PageHeader title="Projets" />)
    expect(screen.queryByText('Gérer vos projets')).not.toBeInTheDocument()
  })

  it("affiche l'icône quand fournie", () => {
    render(<PageHeader title="Projets" icon={<FolderOpen data-testid="icon" />} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('affiche le slot actions quand fourni', () => {
    render(<PageHeader title="Projets" actions={<button>Nouveau projet</button>} />)
    expect(screen.getByRole('button', { name: 'Nouveau projet' })).toBeInTheDocument()
  })

  it('accepte un className personnalisé', () => {
    const { container } = render(<PageHeader title="Projets" className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
