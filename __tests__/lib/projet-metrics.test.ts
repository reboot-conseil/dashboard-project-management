import { describe, it, expect } from 'vitest'
import { calculerProgression } from '@/lib/projet-metrics'

const projetBase = {
  dateDebut: '2026-01-01',
  dateFin: '2026-06-30',
  chargeEstimeeTotale: 20,
}

describe('calculerProgression — sans données', () => {
  it('retourne 0% budget consommé sans activités', () => {
    const result = calculerProgression(projetBase, [], [])
    expect(result.budgetConsommePct).toBe(0)
  })
  it('retourne 0% réalisation sans étapes', () => {
    const result = calculerProgression(projetBase, [], [])
    expect(result.realisationPct).toBe(0)
  })
  it('health est "normal" sans données', () => {
    const result = calculerProgression(projetBase, [], [])
    expect(result.health).toBe('normal')
  })
  it('ne plante pas si etapes est null', () => {
    expect(() => calculerProgression(projetBase, null as any, [])).not.toThrow()
  })
  it('ne plante pas si activites est null', () => {
    expect(() => calculerProgression(projetBase, [], null as any)).not.toThrow()
  })
})

describe('calculerProgression — méthode par charges', () => {
  const etapes = [
    { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: 10 },
    { id: 2, nom: 'Phase 2', statut: 'A_FAIRE' as const, chargeEstimeeJours: 10 },
  ]

  it('utilise la méthode "charges" quand les étapes ont des estimations', () => {
    const result = calculerProgression(projetBase, etapes, [])
    expect(result.methodeRealisation).toBe('charges')
  })
  it('calcule 50% réalisation si 1 étape sur 2 validée (poids égal)', () => {
    const result = calculerProgression(projetBase, etapes, [])
    expect(result.realisationPct).toBe(50)
  })
  it('calcule 100% si toutes les étapes sont validées', () => {
    const toutesValidees = etapes.map(e => ({ ...e, statut: 'VALIDEE' as const }))
    const result = calculerProgression(projetBase, toutesValidees, [])
    expect(result.realisationPct).toBe(100)
  })
})

describe("calculerProgression — méthode par nombre d'étapes", () => {
  const etapesSansCharge = [
    { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: null },
    { id: 2, nom: 'Phase 2', statut: 'A_FAIRE' as const, chargeEstimeeJours: null },
  ]

  it("utilise la méthode 'etapes' quand aucune étape n'a d'estimation", () => {
    const result = calculerProgression(projetBase, etapesSansCharge, [])
    expect(result.methodeRealisation).toBe('etapes')
  })
  it('calcule 50% si 1 étape sur 2 validée', () => {
    const result = calculerProgression(projetBase, etapesSansCharge, [])
    expect(result.realisationPct).toBe(50)
  })
})

describe('calculerProgression — budget consommé', () => {
  it('calcule le budget consommé en fonction des heures saisies', () => {
    const projet = { dateDebut: '2026-01-01', dateFin: '2026-06-30', chargeEstimeeTotale: 10 }
    const activites = [
      { heures: 40, date: '2026-01-10', etapeId: null },
    ]
    const result = calculerProgression(projet, [], activites)
    expect(result.budgetConsommePct).toBe(50)
  })
  it('retourne 0% si chargeEstimeeTotale = 0', () => {
    const projet = { dateDebut: '2026-01-01', dateFin: '2026-06-30', chargeEstimeeTotale: 0 }
    const activites = [{ heures: 8, date: '2026-01-10', etapeId: null }]
    const result = calculerProgression(projet, [], activites)
    expect(result.budgetConsommePct).toBe(0)
  })
})

describe('calculerProgression — health score', () => {
  it('health est "bon" si réalisation > budget consommé', () => {
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: 10 },
    ]
    const activites = [
      { heures: 8, date: '2026-01-10', etapeId: 1 },
    ]
    const result = calculerProgression(projetBase, etapes, activites)
    expect(result.health).toBe('bon')
    expect(result.ecart).toBeGreaterThan(0)
  })

  it('health est "critique" si écart < -10%', () => {
    const projet = { dateDebut: '2026-01-01', dateFin: '2026-06-30', chargeEstimeeTotale: 10 }
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'A_FAIRE' as const, chargeEstimeeJours: 10 },
    ]
    const activites = [
      { heures: 200, date: '2026-01-15', etapeId: null },
    ]
    const result = calculerProgression(projet, etapes, activites)
    expect(result.health).toBe('critique')
  })
})

describe('calculerProgression — alertes', () => {
  it('génère une alerte critique si budget > 90% et réalisation < 70%', () => {
    const projet = { dateDebut: '2026-01-01', dateFin: '2026-06-30', chargeEstimeeTotale: 10 }
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'A_FAIRE' as const, chargeEstimeeJours: null },
      { id: 2, nom: 'Phase 2', statut: 'A_FAIRE' as const, chargeEstimeeJours: null },
      { id: 3, nom: 'Phase 3', statut: 'A_FAIRE' as const, chargeEstimeeJours: null },
    ]
    const activites = [
      { heures: 76, date: '2026-01-15', etapeId: null },
    ]
    const result = calculerProgression(projet, etapes, activites)
    const alertesCritiques = result.alertes.filter(a => a.type === 'critique')
    expect(alertesCritiques.length).toBeGreaterThan(0)
  })
  it("ne génère pas d'alerte si le projet est on-track", () => {
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: 10 },
    ]
    const activites = [
      { heures: 16, date: '2026-01-10', etapeId: 1 },
    ]
    const result = calculerProgression(projetBase, etapes, activites)
    expect(result.alertes).toHaveLength(0)
  })
})

describe('calculerProgression — étape EN_COURS (prorata)', () => {
  it("une étape EN_COURS contribue partiellement à realisationPct (plafonné à 90%)", () => {
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'EN_COURS' as const, chargeEstimeeJours: 10 },
    ]
    // 40h saisies sur l'étape = 5 jours sur 10 estimés = 50% → prorata 50%
    const activites = [
      { heures: 40, date: '2026-01-10', etapeId: 1 },
    ]
    const result = calculerProgression(projetBase, etapes, activites)
    expect(result.methodeRealisation).toBe('charges')
    // realisationPct doit être entre 0 et 90 (plafonné)
    expect(result.realisationPct).toBeGreaterThan(0)
    expect(result.realisationPct).toBeLessThanOrEqual(90)
  })
  it("le prorata est plafonné à 90% même si les heures dépassent l'estimation", () => {
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'EN_COURS' as const, chargeEstimeeJours: 5 },
    ]
    // 200h saisies = 25 jours, bien au-delà de l'estimation de 5j → doit être plafonné à 90%
    const activites = [
      { heures: 200, date: '2026-01-10', etapeId: 1 },
    ]
    const result = calculerProgression(projetBase, etapes, activites)
    expect(result.realisationPct).toBeLessThanOrEqual(90)
  })
})

describe('calculerProgression — alerte étapes en dépassement', () => {
  it('génère une alerte warning si une étape VALIDEE dépasse son estimation de plus de 20%', () => {
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: 5 },
    ]
    // 50h réalisées = 6.25j sur 5j estimés → +25% de dépassement → alerte
    const activites = [
      { heures: 50, date: '2026-01-10', etapeId: 1 },
    ]
    const result = calculerProgression(projetBase, etapes, activites)
    const alertesWarning = result.alertes.filter(a => a.type === 'warning')
    expect(alertesWarning.length).toBeGreaterThan(0)
  })
  it("ne génère pas d'alerte dépassement si le dépassement est inférieur à 20%", () => {
    const etapes = [
      { id: 1, nom: 'Phase 1', statut: 'VALIDEE' as const, chargeEstimeeJours: 10 },
    ]
    // 88h = 11j sur 10j estimés → +10% → pas d'alerte dépassement
    const activites = [
      { heures: 88, date: '2026-01-10', etapeId: 1 },
    ]
    const result = calculerProgression(projetBase, etapes, activites)
    const alertesDepassement = result.alertes.filter(
      a => a.type === 'warning' && a.message.includes('dépassé')
    )
    expect(alertesDepassement).toHaveLength(0)
  })
})
