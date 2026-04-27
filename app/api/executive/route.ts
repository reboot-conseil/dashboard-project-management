import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { differenceInDays, subMonths, startOfMonth, endOfMonth, format, addMonths } from "date-fns";
import { CA, cout, marge, margePct, HEURES_PAR_JOUR } from "@/lib/financial";

export async function GET() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  // ── Parallel queries ──────────────────────────────────────────
  const [
    consultantsActifs,
    projetsAll,
    activitesAnnee,
    etapesAll,
  ] = await Promise.all([
    prisma.consultant.findMany({ where: { actif: true }, select: { id: true, nom: true, tjm: true, coutJournalierEmployeur: true } }),
    prisma.projet.findMany({
      include: {
        activites: { include: { consultant: { select: { id: true, nom: true, tjm: true, coutJournalierEmployeur: true } } } },
        etapes: { select: { id: true, statut: true, deadline: true, updatedAt: true } },
      },
    }),
    prisma.activite.findMany({
      where: { date: { gte: yearStart, lte: yearEnd } },
      include: { consultant: { select: { id: true, nom: true, tjm: true, coutJournalierEmployeur: true } } },
    }),
    prisma.etape.findMany({
      where: { statut: "VALIDEE", deadline: { not: null } },
      select: { deadline: true, updatedAt: true },
    }),
  ]);

  // ── 1. Performance Globale ────────────────────────────────────
  const caAnnuel = activitesAnnee
    .filter((a) => a.facturable)
    .reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
  const coutAnnuel = activitesAnnee.reduce(
    (s, a) => s + cout(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0
  );
  const margeGlobale = marge(caAnnuel, coutAnnuel);
  const tauxMargeGlobal = Math.round(margePct(caAnnuel, coutAnnuel) * 10) / 10;

  // Projection: linear extrapolation based on elapsed year
  const dayOfYear = Math.ceil((now.getTime() - yearStart.getTime()) / 86400000);
  const projectionCA = dayOfYear > 0 ? Math.round((caAnnuel / dayOfYear) * 365) : 0;

  // Heures totales
  const heuresAnnee = activitesAnnee.reduce((s, a) => s + Number(a.heures), 0);
  const heuresFacturables = activitesAnnee.filter((a) => a.facturable).reduce((s, a) => s + Number(a.heures), 0);
  const tauxFacturation = heuresAnnee > 0 ? Math.round((heuresFacturables / heuresAnnee) * 1000) / 10 : 0;

  // Capacity
  const joursOuvresAnnee = Math.round(365 * 5 / 7);
  const joursOuvresEcoules = Math.round(dayOfYear * 5 / 7);
  const capaciteTheorique = consultantsActifs.length * joursOuvresEcoules * HEURES_PAR_JOUR;
  const tauxOccupation = capaciteTheorique > 0 ? Math.round((heuresAnnee / capaciteTheorique) * 1000) / 10 : 0;

  // ── 2. ROI par projet ─────────────────────────────────────────
  const roiParProjet: { projetId: number; projetNom: string; client: string; roi: number; ca: number; cout: number; statut: string }[] = [];
  for (const p of projetsAll) {
    const ca = p.activites
      .filter((a) => a.facturable)
      .reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
    const coutProjet = p.activites.reduce(
      (s, a) => s + cout(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0
    );
    if (coutProjet <= 0 && ca <= 0) continue;
    const roi = coutProjet > 0 ? Math.round(((ca - coutProjet) / coutProjet) * 1000) / 10 : 0;
    roiParProjet.push({ projetId: p.id, projetNom: p.nom, client: p.client, roi, ca: Math.round(ca), cout: Math.round(coutProjet), statut: p.statut });
  }
  roiParProjet.sort((a, b) => b.roi - a.roi);

  // ROI distribution
  const roiDistribution = {
    excellent: roiParProjet.filter((r) => r.roi > 50).length,
    bon: roiParProjet.filter((r) => r.roi > 25 && r.roi <= 50).length,
    moyen: roiParProjet.filter((r) => r.roi > 10 && r.roi <= 25).length,
    faible: roiParProjet.filter((r) => r.roi <= 10).length,
  };

  const top3Rentables = roiParProjet.slice(0, 3);
  const projetsSurveiller = roiParProjet.filter((r) => r.roi < 25 && (r.ca > 0 || r.cout > 0));

  // ── 3. Pipeline & Prévisions ──────────────────────────────────
  const projetsPlanifies = projetsAll.filter((p) => p.statut === "PLANIFIE");
  const pipelineCA = projetsPlanifies.reduce((s, p) => s + Number(p.budget ?? 0), 0);

  // Prévisions CA 3 prochains mois (average monthly CA * remaining factor)
  const previsions3Mois: { mois: string; caPrevu: number }[] = [];
  const moisActuel = now.getMonth();
  const caMensuelMoyen = moisActuel > 0 ? caAnnuel / moisActuel : caAnnuel;
  for (let i = 1; i <= 3; i++) {
    const moisDate = addMonths(now, i);
    previsions3Mois.push({
      mois: format(moisDate, "MMM yyyy"),
      caPrevu: Math.round(caMensuelMoyen),
    });
  }

  // Risques
  const risques: { type: string; description: string; impact: string; projetNom?: string }[] = [];
  for (const p of projetsAll) {
    if (p.statut === "TERMINE") continue;
    const budget = Number(p.budget ?? 0);
    const consomme = p.activites.reduce(
      (s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0
    );
    if (budget > 0 && consomme > budget) {
      risques.push({ type: "budget", description: `Budget dépassé (${Math.round((consomme / budget) * 100)}%)`, impact: "critique", projetNom: p.nom });
    }
    for (const e of p.etapes) {
      if (!e.deadline || e.statut === "VALIDEE") continue;
      const jours = differenceInDays(new Date(e.deadline), now);
      if (jours < 0) {
        risques.push({ type: "deadline", description: `Deadline dépassée de ${Math.abs(jours)}j`, impact: "critique", projetNom: p.nom });
        break;
      }
    }
  }

  // ── 4. Équipe & Capacité ──────────────────────────────────────
  // Utilisation par consultant (mois courant)
  const moisDebut = startOfMonth(now);
  const moisFin = endOfMonth(now);
  const activitesMois = activitesAnnee.filter((a) => {
    const d = new Date(a.date);
    return d >= moisDebut && d <= moisFin;
  });

  const utilisationParConsultant: { id: number; nom: string; heures: number; capacite: number; taux: number }[] = [];
  const joursOuvresMois = Math.round(30 * 5 / 7);
  const capaciteMoisParConsultant = joursOuvresMois * HEURES_PAR_JOUR;

  for (const c of consultantsActifs) {
    const heures = activitesMois
      .filter((a) => a.consultant.id === c.id)
      .reduce((s, a) => s + Number(a.heures), 0);
    const taux = capaciteMoisParConsultant > 0 ? Math.round((heures / capaciteMoisParConsultant) * 1000) / 10 : 0;
    utilisationParConsultant.push({
      id: c.id,
      nom: c.nom,
      heures: Math.round(heures * 10) / 10,
      capacite: capaciteMoisParConsultant,
      taux,
    });
  }
  utilisationParConsultant.sort((a, b) => b.taux - a.taux);

  // Capacité disponible
  const totalHeuresMois = utilisationParConsultant.reduce((s, c) => s + c.heures, 0);
  const totalCapaciteMois = consultantsActifs.length * capaciteMoisParConsultant;
  const capaciteDisponible = Math.max(0, totalCapaciteMois - totalHeuresMois);
  const joursHommeDisponibles = Math.round(capaciteDisponible / HEURES_PAR_JOUR);

  // Projection recrutement
  const besoinRecrutement = tauxOccupation > 90
    ? Math.ceil((tauxOccupation - 85) / 100 * consultantsActifs.length)
    : 0;

  // ── 5. Tendances 12 mois ──────────────────────────────────────
  const tendance12Mois: { mois: string; ca: number; marge: number; couts: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const moisDate = subMonths(now, i);
    const mDebut = startOfMonth(moisDate);
    const mFin = endOfMonth(moisDate);
    const moisActs = activitesAnnee.filter((a) => {
      const d = new Date(a.date);
      return d >= mDebut && d <= mFin;
    });
    // For months before yearStart, we need a separate query
    let mCA: number, mCout: number;
    if (mDebut < yearStart) {
      const olderActs = await prisma.activite.findMany({
        where: { date: { gte: mDebut, lte: mFin } },
        include: { consultant: { select: { tjm: true, coutJournalierEmployeur: true } } },
      });
      mCA = olderActs.filter((a) => a.facturable).reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
      mCout = olderActs.reduce((s, a) => s + cout(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0);
    } else {
      mCA = moisActs.filter((a) => a.facturable).reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
      mCout = moisActs.reduce((s, a) => s + cout(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0);
    }
    tendance12Mois.push({
      mois: format(moisDate, "MMM yy"),
      ca: Math.round(mCA),
      marge: Math.round(marge(mCA, mCout)),
      couts: Math.round(mCout),
    });
  }

  // Comparaison mois actuel vs mois dernier
  const moisActuelData = tendance12Mois[tendance12Mois.length - 1];
  const moisDernierData = tendance12Mois.length >= 2 ? tendance12Mois[tendance12Mois.length - 2] : null;

  // ── 6. Actions Recommandées ───────────────────────────────────
  const actions: { titre: string; description: string; priorite: string; impact: string }[] = [];

  if (tauxMargeGlobal < 35) {
    actions.push({
      titre: "Améliorer la marge",
      description: `Marge globale à ${tauxMargeGlobal}%, en dessous du seuil de 35%. Revoir les TJM ou réduire les coûts.`,
      priorite: "haute",
      impact: `+${Math.round((35 - tauxMargeGlobal) * caAnnuel / 100)} € si marge atteint 35%`,
    });
  }

  const sousUtilises = utilisationParConsultant.filter((c) => c.taux < 60);
  if (sousUtilises.length > 0) {
    actions.push({
      titre: "Consultants sous-utilisés",
      description: `${sousUtilises.length} consultant(s) à moins de 60% de capacité : ${sousUtilises.map((c) => c.nom).join(", ")}`,
      priorite: "moyenne",
      impact: `${Math.round(sousUtilises.reduce((s, c) => s + (c.capacite - c.heures), 0))}h de capacité disponible`,
    });
  }

  if (pipelineCA < caMensuelMoyen * 2) {
    actions.push({
      titre: "Intensifier le commercial",
      description: `Pipeline de ${Math.round(pipelineCA).toLocaleString("fr-FR")} €, insuffisant (objectif: ${Math.round(caMensuelMoyen * 2).toLocaleString("fr-FR")} €)`,
      priorite: "haute",
      impact: "Sécuriser le CA des prochains mois",
    });
  }

  const projetsEnRetard = projetsAll.filter((p) => {
    if (p.statut === "TERMINE") return false;
    return p.etapes.some((e) => e.deadline && e.statut !== "VALIDEE" && differenceInDays(new Date(e.deadline), now) < 0);
  });
  if (projetsEnRetard.length > 0) {
    actions.push({
      titre: "Revoir le planning",
      description: `${projetsEnRetard.length} projet(s) avec deadlines dépassées`,
      priorite: "haute",
      impact: "Risque client et pénalités potentielles",
    });
  }

  if (besoinRecrutement > 0) {
    actions.push({
      titre: "Lancer un recrutement",
      description: `Taux d'occupation à ${tauxOccupation}%. Besoin estimé : ${besoinRecrutement} consultant(s) supplémentaire(s).`,
      priorite: "moyenne",
      impact: "Augmenter la capacité de livraison",
    });
  }

  // Étapes livrées à temps
  let etapesATemps = 0;
  let etapesTotalCount = 0;
  for (const e of etapesAll) {
    if (!e.deadline) continue;
    etapesTotalCount++;
    if (new Date(e.updatedAt) <= new Date(e.deadline)) etapesATemps++;
  }
  const pctEtapesATemps = etapesTotalCount > 0 ? Math.round((etapesATemps / etapesTotalCount) * 1000) / 10 : 0;

  return NextResponse.json({
    // Performance globale
    caAnnuel: Math.round(caAnnuel),
    coutAnnuel: Math.round(coutAnnuel),
    margeGlobale: Math.round(margeGlobale),
    tauxMargeGlobal,
    projectionCA,
    tauxFacturation,
    tauxOccupation,
    heuresAnnee: Math.round(heuresAnnee),
    consultantsActifs: consultantsActifs.length,
    projetsActifs: projetsAll.filter((p) => p.statut === "EN_COURS").length,
    pctEtapesATemps,

    // Rentabilité
    roiDistribution,
    top3Rentables,
    projetsSurveiller,

    // Pipeline
    pipelineCA: Math.round(pipelineCA),
    projetsPlanifies: projetsPlanifies.length,
    previsions3Mois,
    risques,

    // Équipe
    utilisationParConsultant,
    capaciteDisponible: Math.round(capaciteDisponible),
    joursHommeDisponibles,
    besoinRecrutement,

    // Tendances
    tendance12Mois,
    comparaisonMois: {
      actuel: moisActuelData,
      precedent: moisDernierData,
    },

    // Actions
    actions,
  });
}
