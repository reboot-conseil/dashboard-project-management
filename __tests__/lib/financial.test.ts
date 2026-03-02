import { describe, it, expect } from 'vitest'
import { CA, cout, marge, margePct, margeLabel } from '@/lib/financial'

describe('CA', () => {
  it('calcule le CA pour une journée complète (8h) à TJM 500', () => {
    expect(CA(8, 500)).toBe(500)
  })
  it('calcule le CA pour une demi-journée (4h) à TJM 500', () => {
    expect(CA(4, 500)).toBe(250)
  })
  it('calcule le CA pour 1h à TJM 800', () => {
    expect(CA(1, 800)).toBe(100)
  })
  it('retourne 0 si heures = 0', () => {
    expect(CA(0, 500)).toBe(0)
  })
  it('retourne 0 si TJM = 0', () => {
    expect(CA(8, 0)).toBe(0)
  })
  it('fonctionne avec des heures fractionnaires', () => {
    expect(CA(2.5, 400)).toBeCloseTo(125)
  })
})

describe('cout', () => {
  it('calcule le coût pour une journée complète à 350€/jour', () => {
    expect(cout(8, 350)).toBe(350)
  })
  it('calcule le coût pour une demi-journée', () => {
    expect(cout(4, 350)).toBe(175)
  })
  it('retourne 0 si heures = 0', () => {
    expect(cout(0, 350)).toBe(0)
  })
  it('retourne 0 si coutJour = 0', () => {
    expect(cout(8, 0)).toBe(0)
  })
})

describe('marge', () => {
  it('calcule la marge (CA - coût)', () => {
    expect(marge(500, 350)).toBe(150)
  })
  it('retourne une marge négative si coût > CA', () => {
    expect(marge(300, 350)).toBe(-50)
  })
  it('retourne 0 si CA = coût', () => {
    expect(marge(500, 500)).toBe(0)
  })
})

describe('margePct', () => {
  it('calcule 40% de marge sur CA=500 coût=300', () => {
    expect(margePct(500, 300)).toBe(40)
  })
  it('retourne 0 si CA = 0 (pas de division par zéro)', () => {
    expect(margePct(0, 0)).toBe(0)
  })
  it('retourne 0 si CA = 0 même avec un coût positif (pas de division par zéro)', () => {
    expect(margePct(0, 350)).toBe(0)
  })
  it('retourne une valeur négative si coût > CA', () => {
    expect(margePct(300, 350)).toBeCloseTo(-16.67, 1)
  })
  it('retourne 0% si CA = coût', () => {
    expect(margePct(500, 500)).toBe(0)
  })
  it('retourne 100% si coût = 0', () => {
    expect(margePct(500, 0)).toBe(100)
  })
})

describe('margeLabel', () => {
  it('retourne "bon" pour 40% exactement (seuil inclus)', () => {
    expect(margeLabel(40)).toBe('bon')
  })
  it('retourne "bon" pour 50%', () => {
    expect(margeLabel(50)).toBe('bon')
  })
  it('retourne "moyen" pour 30% exactement (seuil inclus)', () => {
    expect(margeLabel(30)).toBe('moyen')
  })
  it('retourne "moyen" pour 39%', () => {
    expect(margeLabel(39)).toBe('moyen')
  })
  it('retourne "faible" pour 29%', () => {
    expect(margeLabel(29)).toBe('faible')
  })
  it('retourne "faible" pour 0%', () => {
    expect(margeLabel(0)).toBe('faible')
  })
  it('retourne "faible" pour une marge négative', () => {
    expect(margeLabel(-5)).toBe('faible')
  })
})
