import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KanbanBoard } from '@/components/projets/kanban-board'
import type { Etape } from '@/components/projets/types'

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const makeEtape = (overrides: Partial<Etape> = {}): Etape => ({
  id: 1,
  projetId: 10,
  nom: 'Étape test',
  description: null,
  statut: 'A_FAIRE',
  deadline: null,
  chargeEstimeeJours: null,
  ordre: 1,
  ...overrides,
})

const defaultProps = {
  etapes: [],
  heuresParEtape: new Map<number, number>(),
  filtreEtapeId: null,
  onFiltreEtapeId: vi.fn(),
  onAddEtape: vi.fn(),
  onEditEtape: vi.fn(),
  onDeleteEtape: vi.fn(),
  onMoveEtape: vi.fn(),
}

describe('KanbanBoard', () => {
  it('affiche les 3 colonnes', () => {
    render(<KanbanBoard {...defaultProps} />)
    expect(screen.getByTestId('kanban-col-A_FAIRE')).toBeInTheDocument()
    expect(screen.getByTestId('kanban-col-EN_COURS')).toBeInTheDocument()
    expect(screen.getByTestId('kanban-col-VALIDEE')).toBeInTheDocument()
  })

  it('affiche les labels des colonnes', () => {
    render(<KanbanBoard {...defaultProps} />)
    expect(screen.getByText(/À faire/)).toBeInTheDocument()
    expect(screen.getByText(/En cours/)).toBeInTheDocument()
    expect(screen.getByText(/Validée/)).toBeInTheDocument()
  })

  it('affiche le compteur (0) pour chaque colonne vide', () => {
    render(<KanbanBoard {...defaultProps} />)
    const zeros = screen.getAllByText('(0)')
    expect(zeros).toHaveLength(3)
  })

  it('distribue les étapes dans la bonne colonne', () => {
    const etapes: Etape[] = [
      makeEtape({ id: 1, statut: 'A_FAIRE', nom: 'Tâche A' }),
      makeEtape({ id: 2, statut: 'EN_COURS', nom: 'Tâche B' }),
      makeEtape({ id: 3, statut: 'VALIDEE', nom: 'Tâche C' }),
    ]
    render(<KanbanBoard {...defaultProps} etapes={etapes} />)
    expect(screen.getByTestId('kanban-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('kanban-card-2')).toBeInTheDocument()
    expect(screen.getByTestId('kanban-card-3')).toBeInTheDocument()
  })

  it("affiche le nom de l'étape", () => {
    const etapes = [makeEtape({ nom: 'Mon étape importante' })]
    render(<KanbanBoard {...defaultProps} etapes={etapes} />)
    expect(screen.getByText('Mon étape importante')).toBeInTheDocument()
  })

  it('affiche la description si présente', () => {
    const etapes = [makeEtape({ description: 'Une belle description' })]
    render(<KanbanBoard {...defaultProps} etapes={etapes} />)
    expect(screen.getByText('Une belle description')).toBeInTheDocument()
  })

  it("appelle onAddEtape avec le bon statut au clic sur '+'", () => {
    const onAddEtape = vi.fn()
    render(<KanbanBoard {...defaultProps} onAddEtape={onAddEtape} />)
    // Il y a 3 boutons "+"
    const addButtons = screen.getAllByTitle('Ajouter une étape')
    fireEvent.click(addButtons[0]) // A_FAIRE
    expect(onAddEtape).toHaveBeenCalledWith('A_FAIRE')
    fireEvent.click(addButtons[1]) // EN_COURS
    expect(onAddEtape).toHaveBeenCalledWith('EN_COURS')
  })

  it('appelle onEditEtape au clic sur Modifier', () => {
    const onEditEtape = vi.fn()
    const etape = makeEtape({ id: 5 })
    render(<KanbanBoard {...defaultProps} etapes={[etape]} onEditEtape={onEditEtape} />)
    fireEvent.click(screen.getByTestId('btn-edit-5'))
    expect(onEditEtape).toHaveBeenCalledWith(etape)
  })

  it('appelle onDeleteEtape au clic sur Supprimer', () => {
    const onDeleteEtape = vi.fn()
    const etape = makeEtape({ id: 7 })
    render(<KanbanBoard {...defaultProps} etapes={[etape]} onDeleteEtape={onDeleteEtape} />)
    fireEvent.click(screen.getByTestId('btn-delete-7'))
    expect(onDeleteEtape).toHaveBeenCalledWith(etape)
  })

  it('appelle onFiltreEtapeId au clic sur Voir activités', () => {
    const onFiltreEtapeId = vi.fn()
    const etape = makeEtape({ id: 9 })
    render(<KanbanBoard {...defaultProps} etapes={[etape]} onFiltreEtapeId={onFiltreEtapeId} />)
    fireEvent.click(screen.getByTestId('btn-filtre-9'))
    expect(onFiltreEtapeId).toHaveBeenCalledWith(9)
  })

  it('toggle filtreEtapeId : clic sur étape active → null', () => {
    const onFiltreEtapeId = vi.fn()
    const etape = makeEtape({ id: 9 })
    render(
      <KanbanBoard
        {...defaultProps}
        etapes={[etape]}
        filtreEtapeId={9}
        onFiltreEtapeId={onFiltreEtapeId}
      />
    )
    fireEvent.click(screen.getByTestId('btn-filtre-9'))
    expect(onFiltreEtapeId).toHaveBeenCalledWith(null)
  })

  it("masque le bouton 'Reculer' pour une étape A_FAIRE", () => {
    const etape = makeEtape({ statut: 'A_FAIRE' })
    render(<KanbanBoard {...defaultProps} etapes={[etape]} />)
    expect(screen.queryByTitle("Reculer l'étape")).not.toBeInTheDocument()
  })

  it("masque le bouton 'Avancer' pour une étape VALIDEE", () => {
    const etape = makeEtape({ statut: 'VALIDEE' })
    render(<KanbanBoard {...defaultProps} etapes={[etape]} />)
    expect(screen.queryByTitle("Avancer l'étape")).not.toBeInTheDocument()
  })

  it('appelle onMoveEtape forward pour EN_COURS', () => {
    const onMoveEtape = vi.fn()
    const etape = makeEtape({ statut: 'EN_COURS' })
    render(<KanbanBoard {...defaultProps} etapes={[etape]} onMoveEtape={onMoveEtape} />)
    fireEvent.click(screen.getByTitle("Avancer l'étape"))
    expect(onMoveEtape).toHaveBeenCalledWith(etape, 'forward')
  })

  it('affiche les heures si heuresParEtape > 0', () => {
    const etape = makeEtape({ id: 3 })
    const heuresParEtape = new Map([[3, 16]])
    render(<KanbanBoard {...defaultProps} etapes={[etape]} heuresParEtape={heuresParEtape} />)
    expect(screen.getByText(/16h/)).toBeInTheDocument()
  })

  it('affiche la deadline formatée', () => {
    const etape = makeEtape({ deadline: '2026-12-31' })
    render(<KanbanBoard {...defaultProps} etapes={[etape]} />)
    expect(screen.getByText(/31\/12\/2026/)).toBeInTheDocument()
  })

  it('affiche le compteur correct dans la colonne', () => {
    const etapes = [
      makeEtape({ id: 1, statut: 'A_FAIRE' }),
      makeEtape({ id: 2, statut: 'A_FAIRE' }),
    ]
    render(<KanbanBoard {...defaultProps} etapes={etapes} />)
    expect(screen.getByTestId('kanban-col-A_FAIRE')).toHaveTextContent('(2)')
  })
})
