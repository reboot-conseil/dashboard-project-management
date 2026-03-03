import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { differenceInDays, subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");

  if (!dateDebut || !dateFin) {
    return NextResponse.json({ error: "dateDebut et dateFin sont requis" }, { status: 400 });
  }

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  fin.setHours(23, 59, 59, 999);
  const now = new Date();

  const dateFilter = { date: { gte: debut, lte: fin } };

  // ── Requêtes parallèles ──────────────────────────────────────
  const [
    activites,
    totalAgg,
    totalFacturableAgg,
    consultantsActifs,
    projetsActifs,
    projetsAll,
    etapesAll,
  ] = await Promise.all([
    prisma.activite.findMany({
      where: dateFilter,
      include: {
        consultant: { select: { id: true, nom: true, tjm: true, coutJournalierEmployeur: true } },
        projet: { select: { id: true, nom: true, budget: true, statut: true, dateDebut: true, dateFin: true } },
      },
    }),
    prisma.activite.aggregate({ where: dateFilter, _sum: { heures: true } }),
    prisma.activite.aggregate({ where: { ...dateFilter, facturable: true }, _sum: { heures: true } }),
    prisma.consultant.count({ where: { actif: true } }),
    prisma.projet.findMany({
      where: { statut: { in: ["EN_COURS", "PLANIFIE"] } },
      include: {
        activites: {
          include: { consultant: { select: { tjm: true, coutJournalierEmployeur: true } } },
        },
        etapes: { select: { id: true, statut: true, deadline: true } },
      },
    }),
    prisma.projet.findMany({
      include: {
        activites: { include: { consultant: { select: { tjm: true, coutJournalierEmployeur: true } } } },
        etapes: { select: { statut: true, deadline: true } },
      },
    }),
    prisma.etape.findMany({
      where: { statut: "VALIDEE", deadline: { not: null } },
      select: { deadline: true, updatedAt: true },
    }),
  ]);

  const totalHeures = Number(totalAgg._sum.heures ?? 0);
  const totalFacturable = Number(totalFacturableAgg._sum.heures ?? 0);

  // ── 1. Taux de marge global ────────────────────────────────────
  const caTotal = activites
    .filter((a) => a.facturable)
    .reduce((s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);
  const coutTotal = activites.reduce(
    (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0
  );
  const margeBrute = caTotal - coutTotal;
  const tauxMarge = caTotal > 0 ? Math.round((margeBrute / caTotal) * 1000) / 10 : 0;

  // ── 2. Taux de facturation ─────────────────────────────────────
  const tauxFacturation = totalHeures > 0
    ? Math.round((totalFacturable / totalHeures) * 1000) / 10
    : 0;

  // ── 3. CA vs objectif mensuel ──────────────────────────────────
  // objectif passé en param ou défaut
  const objectifCA = parseFloat(searchParams.get("objectifCA") ?? "0");
  const objectifHeures = parseFloat(searchParams.get("objectifHeures") ?? "0");
  const pctObjectifCA = objectifCA > 0 ? Math.round((caTotal / objectifCA) * 1000) / 10 : 0;
  const pctObjectifHeures = objectifHeures > 0 ? Math.round((totalHeures / objectifHeures) * 1000) / 10 : 0;

  // ── 4. Nombre projets dépassement budget ───────────────────────
  let projetsDepassementBudget = 0;
  for (const p of projetsActifs) {
    const budget = Number(p.budget ?? 0);
    if (budget <= 0) continue;
    const consomme = p.activites.reduce(
      (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0
    );
    if (consomme > budget) projetsDepassementBudget++;
  }

  // ── 5. Nombre deadlines < 7 jours ─────────────────────────────
  let deadlinesProches = 0;
  for (const p of projetsActifs) {
    for (const e of p.etapes) {
      if (!e.deadline || e.statut === "VALIDEE") continue;
      const jours = differenceInDays(new Date(e.deadline), now);
      if (jours >= 0 && jours < 7) deadlinesProches++;
    }
  }

  // ── 6. Taux d'occupation consultants ───────────────────────────
  // Capacité théorique : 8h/jour × jours ouvrés dans la période
  const totalDays = Math.ceil((fin.getTime() - debut.getTime()) / 86400000) + 1;
  // Rough estimate: 5/7 of total days are workdays
  const joursOuvres = Math.round(totalDays * 5 / 7);
  const capaciteTheorique = consultantsActifs * joursOuvres * 8;
  const tauxOccupation = capaciteTheorique > 0
    ? Math.round((totalHeures / capaciteTheorique) * 1000) / 10
    : 0;

  // ── 7. Burn Rate par projet ────────────────────────────────────
  const burnRates: { projetId: number; projetNom: string; burnRate: number }[] = [];
  for (const p of projetsAll) {
    const budget = Number(p.budget ?? 0);
    if (budget <= 0 || !p.dateDebut || !p.dateFin) continue;
    const pDebut = new Date(p.dateDebut);
    const pFin = new Date(p.dateFin);
    const totalDuration = differenceInDays(pFin, pDebut);
    const elapsed = differenceInDays(now, pDebut);
    if (totalDuration <= 0 || elapsed <= 0) continue;
    const pctTempsEcoule = elapsed / totalDuration;
    const consomme = p.activites.reduce(
      (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0
    );
    const pctBudgetConsomme = consomme / budget;
    const burnRate = pctTempsEcoule > 0 ? Math.round((pctBudgetConsomme / pctTempsEcoule) * 100) / 100 : 0;
    burnRates.push({ projetId: p.id, projetNom: p.nom, burnRate });
  }

  // ── 8. Pipeline CA (projets PLANIFIE sur 3 mois) ───────────────
  const projetsPlanning = projetsActifs.filter((p) => p.statut === "PLANIFIE");
  const pipelineCA = projetsPlanning.reduce((s, p) => s + Number(p.budget ?? 0), 0);

  // ── 9. % Étapes livrées à temps ───────────────────────────────
  let etapesATemps = 0;
  let etapesTotal = 0;
  for (const e of etapesAll) {
    if (!e.deadline) continue;
    etapesTotal++;
    // Considère livré à temps si updatedAt <= deadline
    if (new Date(e.updatedAt) <= new Date(e.deadline)) etapesATemps++;
  }
  const pctEtapesATemps = etapesTotal > 0 ? Math.round((etapesATemps / etapesTotal) * 1000) / 10 : 0;

  // ── 10. ROI par projet ─────────────────────────────────────────
  const roiParProjet: { projetId: number; projetNom: string; roi: number; ca: number; cout: number }[] = [];
  for (const p of projetsAll) {
    const ca = p.activites
      .filter((a) => a.facturable)
      .reduce((s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);
    const cout = p.activites.reduce(
      (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0
    );
    if (cout <= 0) continue;
    const roi = Math.round(((ca - cout) / cout) * 1000) / 10;
    roiParProjet.push({ projetId: p.id, projetNom: p.nom, roi, ca, cout });
  }
  const roiMoyen = roiParProjet.length > 0
    ? Math.round(roiParProjet.reduce((s, r) => s + r.roi, 0) / roiParProjet.length * 10) / 10
    : 0;

  // ── Moyennes par jour ──────────────────────────────────────────
  const joursUniques = new Set(activites.map((a) => new Date(a.date).toISOString().split("T")[0]));
  const nbJours = joursUniques.size;
  const moyenneParJour = nbJours > 0 ? Math.round((totalHeures / nbJours) * 10) / 10 : 0;

  // ── Tendance 6 mois ────────────────────────────────────────────
  const tendance6Mois: { mois: string; ca: number; marge: number; heures: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const moisDate = subMonths(now, i);
    const mDebut = startOfMonth(moisDate);
    const mFin = endOfMonth(moisDate);
    const moisActivites = await prisma.activite.findMany({
      where: { date: { gte: mDebut, lte: mFin } },
      include: { consultant: { select: { tjm: true, coutJournalierEmployeur: true } } },
    });
    const mCA = moisActivites
      .filter((a) => a.facturable)
      .reduce((s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);
    const mCout = moisActivites.reduce(
      (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0
    );
    const mHeures = moisActivites.reduce((s, a) => s + Number(a.heures), 0);
    tendance6Mois.push({
      mois: format(moisDate, "MMM yy", { locale: undefined }),
      ca: Math.round(mCA),
      marge: Math.round(mCA - mCout),
      heures: Math.round(mHeures),
    });
  }

  // ── Vélocité par projet ────────────────────────────────────────
  const velociteParProjet: { projetId: number; projetNom: string; velocite: number }[] = [];
  for (const p of projetsAll) {
    if (!p.dateDebut || !p.dateFin || p.etapes.length === 0) continue;
    const pDebut = new Date(p.dateDebut);
    const pFin = new Date(p.dateFin);
    const totalDuration = differenceInDays(pFin, pDebut);
    const elapsed = differenceInDays(now, pDebut);
    if (totalDuration <= 0 || elapsed <= 0) continue;
    const pctTempsEcoule = Math.min(elapsed / totalDuration, 1);
    const etapesTheoriques = p.etapes.length * pctTempsEcoule;
    const etapesRealisees = p.etapes.filter((e) => e.statut === "VALIDEE").length;
    const velocite = etapesTheoriques > 0 ? Math.round((etapesRealisees / etapesTheoriques) * 100) / 100 : 0;
    velociteParProjet.push({ projetId: p.id, projetNom: p.nom, velocite });
  }

  return NextResponse.json({
    // Global KPIs
    tauxMarge,
    tauxFacturation,
    caTotal: Math.round(caTotal),
    coutTotal: Math.round(coutTotal),
    margeBrute: Math.round(margeBrute),
    totalHeures,
    totalFacturable,
    projetsDepassementBudget,
    deadlinesProches,
    tauxOccupation,
    pipelineCA: Math.round(pipelineCA),
    pctEtapesATemps,
    roiMoyen,
    moyenneParJour,
    nbJoursActivite: nbJours,
    consultantsActifs,

    // Objectifs
    pctObjectifCA,
    pctObjectifHeures,

    // Per-project metrics
    burnRates,
    roiParProjet,
    velociteParProjet,

    // Trend
    tendance6Mois,
  });
}
