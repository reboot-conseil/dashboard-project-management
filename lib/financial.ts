/**
 * Formules financières centralisées.
 * Règle universelle : 1 jour = 8 heures.
 */

export const CA = (heures: number, tjm: number): number =>
  (heures / 8) * tjm

export const cout = (heures: number, coutJour: number): number =>
  (heures / 8) * coutJour

export const marge = (ca: number, coutVal: number): number =>
  ca - coutVal

export const margePct = (ca: number, coutVal: number): number =>
  ca > 0 ? ((ca - coutVal) / ca) * 100 : 0

export const margeLabel = (pct: number): 'bon' | 'moyen' | 'faible' =>
  pct >= 40 ? 'bon' : pct >= 30 ? 'moyen' : 'faible'
