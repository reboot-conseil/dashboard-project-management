import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivitesTable } from '@/components/projets/activites-table'
import type { Activite, Etape } from '@/components/projets/types'

const makeActivite = (overrides: Partial<Activite> = {}): Activite => ({
  id: 1,
  date: '2026-01-15',
  heures: 8,
  description: null,
  facturable: true,
  consultant: { id: 1, nom: 'Alice Martin', couleur: '#8B5CF6', tjm: 600 },
  etape: null,
  ...overrides,
})

const makeEtape = (overrides: Partial<Etape> = {}): Etape => ({
  id: 1,
  projetId: 1,
  nom: 'Étape 1',
  description: null,
  statut: 'EN_COURS',
  deadline: null,
  chargeEstimeeJours: null,
  ordre: 1,
  ...overrides,
})

const defaultProps = {
  activites: [],
  etapes: [],
  filtreEtapeId: null,
  onClearFiltre: vi.fn(),
}

describe('ActivitesTable', () => {
  it('affiche le titre "Activités"', () => {
    render(<ActivitesTable {...defaultProps} />)
    expect(screen.getByText('Activités')).toBeInTheDocument()
  })

  it("affiche le message vide si aucune activité", () => {
    render(<ActivitesTable {...defaultProps} />)
    expect(screen.getByText('Aucune activité enregistrée sur ce projet')).toBeInTheDocument()
  })

  it('affiche les activités dans le tableau', () => {
    const activites = [makeActivite({ id: 1 })]
    render(<ActivitesTable {...defaultProps} activites={activites} />)
    expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    expect(screen.getByText('8h')).toBeInTheDocument()
  })

  it('affiche la date formatée', () => {
    const activites = [makeActivite({ date: '2026-03-15' })]
    render(<ActivitesTable {...defaultProps} activites={activites} />)
    expect(screen.getByText('15/03/2026')).toBeInTheDocument()
  })

  it('affiche le badge "Oui" pour facturable', () => {
    render(<ActivitesTable {...defaultProps} activites={[makeActivite({ facturable: true })]} />)
    expect(screen.getByText('Oui')).toBeInTheDocument()
  })

  it('affiche le badge "Non" pour non-facturable', () => {
    render(<ActivitesTable {...defaultProps} activites={[makeActivite({ facturable: false })]} />)
    expect(screen.getByText('Non')).toBeInTheDocument()
  })

  it('affiche "—" si description est null', () => {
    render(<ActivitesTable {...defaultProps} activites={[makeActivite({ description: null })]} />)
    // Plusieurs "—" peuvent apparaître (description + étape null)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('affiche la description si présente', () => {
    render(<ActivitesTable {...defaultProps} activites={[makeActivite({ description: 'Réunion client' })]} />)
    expect(screen.getByText('Réunion client')).toBeInTheDocument()
  })

  it('filtre les activités par étape', () => {
    const etape1 = { id: 10, nom: 'Design' }
    const etape2 = { id: 20, nom: 'Dev' }
    const activites = [
      makeActivite({ id: 1, etape: etape1 }),
      makeActivite({ id: 2, etape: etape2, consultant: { id: 2, nom: 'Bob', couleur: '#10B981', tjm: 500 } }),
    ]
    render(
      <ActivitesTable
        {...defaultProps}
        activites={activites}
        filtreEtapeId={10}
        etapes={[makeEtape({ id: 10, nom: 'Design' })]}
      />
    )
    expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })

  it("affiche le badge de filtre avec le nom de l'étape", () => {
    render(
      <ActivitesTable
        {...defaultProps}
        activites={[makeActivite()]}
        filtreEtapeId={1}
        etapes={[makeEtape({ id: 1, nom: 'Ma belle étape' })]}
      />
    )
    expect(screen.getByText('Filtre : Ma belle étape')).toBeInTheDocument()
  })

  it('appelle onClearFiltre au clic sur "Tout afficher"', () => {
    const onClearFiltre = vi.fn()
    render(
      <ActivitesTable
        {...defaultProps}
        activites={[makeActivite()]}
        filtreEtapeId={1}
        etapes={[makeEtape({ id: 1 })]}
        onClearFiltre={onClearFiltre}
      />
    )
    fireEvent.click(screen.getByText('Tout afficher'))
    expect(onClearFiltre).toHaveBeenCalled()
  })

  it("affiche le message 'aucune activité sur cette étape' si filtré sans résultat", () => {
    render(
      <ActivitesTable
        {...defaultProps}
        activites={[makeActivite({ etape: { id: 99, nom: 'Autre' } })]}
        filtreEtapeId={1}
        etapes={[makeEtape({ id: 1 })]}
      />
    )
    expect(screen.getByText('Aucune activité liée à cette étape')).toBeInTheDocument()
  })

  it("n'affiche pas le bouton filtre si filtreEtapeId est null", () => {
    render(<ActivitesTable {...defaultProps} activites={[makeActivite()]} />)
    expect(screen.queryByText('Tout afficher')).not.toBeInTheDocument()
  })

  it("affiche le nom de l'étape de l'activité dans le tableau", () => {
    const activites = [makeActivite({ etape: { id: 5, nom: 'Phase dev' } })]
    render(<ActivitesTable {...defaultProps} activites={activites} />)
    expect(screen.getByText('Phase dev')).toBeInTheDocument()
  })
})
