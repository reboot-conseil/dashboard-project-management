import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  differenceInDays,
  subMonths,
  addMonths,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";
import { calculerProgression } from "@/lib/projet-metrics";
import { requireAuth } from "@/lib/auth-guard";
import { CA, cout as coutFn, marge as margeFn, margePct, HEURES_PAR_JOUR } from "@/lib/financial";

// GET /api/dashboard/strategique?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD&projetId=X
export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");
  const projetIdParam = searchParams.get("projetId");
  const objectifCAannuel = parseFloat(searchParams.get("objectifCA") ?? "0");
  const objectifMarge = parseFloat(searchParams.get("objectifMarge") ?? "40");

  if (!dateDebut || !dateFin) {
    return NextResponse.json(
      { error: "dateDebut et dateFin sont requis" },
      { status: 400 }
    );
  }

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  fin.setHours(23, 59, 59, 999);
  const now = new Date();

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  const dayOfYear = Math.max(
    Math.ceil((now.getTime() - yearStart.getTime()) / 86400000),
    1
  );

  // Filtre projet optionnel
  const projetFilter =
    projetIdParam && projetIdParam !== "all"
      ? { projetId: parseInt(projetIdParam) }
      : {};

  // ── Requêtes parallèles ──────────────────────────────────────────
  const [
    consultantsActifs,
    projetsAll,
    activitesPeriode,
    activitesAnnee,
    pipelineProjects,
  ] = await Promise.all([
    // Consultants actifs
    prisma.consultant.findMany({
      where: { actif: true },
      select: {
        id: true,
        nom: true,
        couleur: true,
        tjm: true,
        coutJournalierEmployeur: true,
        activites: {
          where: { date: { gte: debut, lte: fin }, ...projetFilter },
          select: { heures: true, facturable: true },
        },
      },
    }),

    // Tous les projets avec activités + étapes (progression complète)
    prisma.projet.findMany({
      ...(projetFilter.projetId ? { where: { id: projetFilter.projetId } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        etapes: {
          select: {
            id: true,
            nom: true,
            statut: true,
            deadline: true,
            chargeEstimeeJours: true,
            updatedAt: true,
          },
          orderBy: { ordre: "asc" },
        },
        activites: {
          select: {
            heures: true,
            facturable: true,
            date: true,
            etapeId: true,
            consultant: {
              select: { id: true, nom: true, tjm: true, coutJournalierEmployeur: true },
            },
          },
        },
      },
    }),

    // Activités de la période filtrée
    prisma.activite.findMany({
      where: { date: { gte: debut, lte: fin }, ...projetFilter },
      select: {
        heures: true,
        facturable: true,
        consultant: { select: { tjm: true, coutJournalierEmployeur: true } },
      },
    }),

    // Activités année entière (YTD pour objectifs)
    prisma.activite.findMany({
      where: { date: { gte: yearStart, lte: yearEnd }, ...projetFilter },
      select: {
        heures: true,
        facturable: true,
        consultant: { select: { tjm: true, coutJournalierEmployeur: true } },
      },
    }),

    // Projets planifiés (pipeline)
    prisma.projet.findMany({
      where: { statut: "PLANIFIE" },
      select: { id: true, nom: true, budget: true },
    }),
  ]);

  // ── KPIs financiers période ──────────────────────────────────────
  const caTotal = activitesPeriode
    .filter((a) => a.facturable)
    .reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
  const coutTotal = activitesPeriode.reduce(
    (s, a) => s + coutFn(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0
  );
  const margeBrute = margeFn(caTotal, coutTotal);
  const tauxMarge = Math.round(margePct(caTotal, coutTotal) * 10) / 10;

  // ── YTD pour objectifs ───────────────────────────────────────────
  const caAnnuelYTD = activitesAnnee
    .filter((a) => a.facturable)
    .reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
  const coutAnnuelYTD = activitesAnnee.reduce(
    (s, a) => s + coutFn(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0
  );
  const margeAnnuelleYTD = margeFn(caAnnuelYTD, coutAnnuelYTD);
  const tauxMargeYTD = Math.round(margePct(caAnnuelYTD, coutAnnuelYTD) * 10) / 10;
  const projectionCAannuel =
    dayOfYear > 0 ? Math.round((caAnnuelYTD / dayOfYear) * 365) : 0;
  const pctObjectifCA =
    objectifCAannuel > 0 ? Math.round((caAnnuelYTD / objectifCAannuel) * 1000) / 10 : 0;
  const pctProjectionObjectif =
    objectifCAannuel > 0 ? Math.round((projectionCAannuel / objectifCAannuel) * 1000) / 10 : 0;

  // ── Progression projets ──────────────────────────────────────────
  const projetsAvecProgression = projetsAll.map((p) => {
    const prog = calculerProgression(
      {
        dateDebut: p.dateDebut?.toISOString() ?? null,
        dateFin: p.dateFin?.toISOString() ?? null,
        chargeEstimeeTotale: p.chargeEstimeeTotale,
      },
      p.etapes.map((e) => ({
        id: e.id,
        nom: e.nom,
        statut: e.statut as "A_FAIRE" | "EN_COURS" | "VALIDEE",
        chargeEstimeeJours: e.chargeEstimeeJours,
      })),
      p.activites.map((a) => ({
        heures: Number(a.heures),
        date: a.date.toISOString(),
        etapeId: a.etapeId,
      }))
    );

    const ca = p.activites
      .filter((a) => a.facturable)
      .reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
    const coutProjet = p.activites.reduce(
      (s, a) => s + coutFn(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0
    );
    const margeProjet = margeFn(ca, coutProjet);
    const tauxMargeProjt = Math.round(margePct(ca, coutProjet) * 10) / 10;
    const budget = Number(p.budget ?? 0);
    const pctBudget = budget > 0 ? Math.round((ca / budget) * 1000) / 10 : 0;
    const roi = coutProjet > 0 ? Math.round(((ca - coutProjet) / coutProjet) * 1000) / 10 : 0;

    // Prochaine deadline
    const prochainDeadline = p.etapes
      .filter((e) => e.deadline && e.statut !== "VALIDEE")
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
    const joursDeadline = prochainDeadline?.deadline
      ? differenceInDays(new Date(prochainDeadline.deadline), now)
      : null;

    return {
      id: p.id,
      nom: p.nom,
      client: p.client,
      statut: p.statut,
      budget,
      pctBudget,
      budgetConsommePct: prog.budgetConsommePct,
      realisationPct: prog.realisationPct,
      ecart: prog.ecart,
      health: prog.health,
      healthLabel: prog.healthLabel,
      dateFinEstimee: prog.dateFinEstimee,
      ca: Math.round(ca),
      cout: Math.round(coutProjet),
      marge: Math.round(margeProjet),
      tauxMarge: tauxMargeProjt,
      roi,
      couleur: p.couleur,
      prochainDeadline: prochainDeadline
        ? {
            nom: prochainDeadline.nom,
            deadline: prochainDeadline.deadline,
            joursRestants: joursDeadline,
          }
        : null,
    };
  });

  // ── Donut chart data (par projet) ────────────────────────────────
  const PROJET_COLORS = [
    "#bfdbfe", "#bbf7d0", "#fecaca", "#fde68a", "#ddd6fe",
    "#fed7aa", "#cffafe", "#e9d5ff", "#fce7f3", "#d1fae5",
  ];
  const donutData = projetsAvecProgression
    .filter((p) => p.ca > 0 || p.cout > 0)
    .map((p, i) => ({
      id: p.id,
      nom: p.nom,
      client: p.client,
      ca: p.ca,
      cout: p.cout,
      marge: p.marge,
      couleur: p.couleur || PROJET_COLORS[i % PROJET_COLORS.length],
    }));

  // ── Décomposition consultants ────────────────────────────────────
  const CONSULTANT_COLORS = [
    "#dbeafe", "#d1fae5", "#fed7aa", "#e9d5ff", "#fecdd3", "#fef3c7",
  ];
  const decompositionConsultants = consultantsActifs
    .map((c, i) => {
      const heures = c.activites.reduce((s, a) => s + Number(a.heures), 0);
      const ca = c.activites
        .filter((a) => a.facturable)
        .reduce((s, a) => s + CA(Number(a.heures), Number(c.tjm ?? 0)), 0);
      return {
        id: c.id,
        nom: c.nom,
        couleur: CONSULTANT_COLORS[i % CONSULTANT_COLORS.length],
        heures: Math.round(heures * 10) / 10,
        ca: Math.round(ca),
      };
    })
    .sort((a, b) => b.ca - a.ca);

  const totalCAConsultants = decompositionConsultants.reduce((s, c) => s + c.ca, 0);

  // ── Taux occupation consultants ──────────────────────────────────
  const totalJoursPeriode = Math.max(
    Math.ceil((fin.getTime() - debut.getTime()) / 86400000) + 1,
    1
  );
  const joursOuvresPeriode = Math.round(totalJoursPeriode * 5 / 7);
  const consultantsOccupation = consultantsActifs.map((c) => {
    const heures = c.activites.reduce((s, a) => s + Number(a.heures), 0);
    const capacite = joursOuvresPeriode * HEURES_PAR_JOUR;
    const taux = capacite > 0 ? Math.round((heures / capacite) * 1000) / 10 : 0;
    return { id: c.id, nom: c.nom, heures: Math.round(heures * 10) / 10, capacite, taux };
  });
  const tauxOccupationMoyen =
    consultantsOccupation.length > 0
      ? Math.round(
          (consultantsOccupation.reduce((s, c) => s + c.taux, 0) /
            consultantsOccupation.length) *
            10
        ) / 10
      : 0;

  // Capacité disponible ce mois
  const startThisMonth = startOfMonth(now);
  const endThisMonth = endOfMonth(now);
  const joursRestantsMois = Math.max(differenceInDays(endThisMonth, now), 0);
  const joursOuvresRestants = Math.round(joursRestantsMois * 5 / 7);
  const capaciteDisponibleHeures =
    consultantsActifs.length * joursOuvresRestants * HEURES_PAR_JOUR * (1 - tauxOccupationMoyen / 100);
  const joursHommeDisponibles = Math.round(capaciteDisponibleHeures / HEURES_PAR_JOUR);

  // Pipeline
  const pipelineCA = pipelineProjects.reduce((s, p) => s + Number(p.budget ?? 0), 0);
  const capaciteAnnuelleRestante = consultantsActifs.length * (365 - dayOfYear) * (5 / 7) * HEURES_PAR_JOUR;
  const besoinRecrutement =
    pipelineCA > 0 &&
    tauxOccupationMoyen > 85 &&
    pipelineCA > caTotal * 3;

  // ── Score Santé Globale ──────────────────────────────────────────
  // 1. Rentabilité (30 pts)
  const ratiosCARatio = projetsAvecProgression
    .filter((p) => p.cout > 0)
    .map((p) => (p.ca / p.cout) * 100);
  const ratioMoyenCA =
    ratiosCARatio.length > 0
      ? ratiosCARatio.reduce((s, v) => s + v, 0) / ratiosCARatio.length
      : 100;

  let scoreRentabilite = 0;
  if (ratioMoyenCA >= 200) scoreRentabilite = 30;
  else if (ratioMoyenCA >= 150) scoreRentabilite = 25;
  else if (ratioMoyenCA >= 125) scoreRentabilite = 20;
  else if (ratioMoyenCA >= 110) scoreRentabilite = 15;
  else if (ratioMoyenCA >= 100) scoreRentabilite = 10;

  // 2. Respect délais (25 pts)
  const projetsEnCours = projetsAvecProgression.filter((p) => p.statut === "EN_COURS");
  let scoreDelais = 0;
  for (const p of projetsEnCours) {
    const j = p.prochainDeadline?.joursRestants;
    if (j === null || j === undefined) { scoreDelais += 5; continue; }
    if (j >= 0) scoreDelais += 5;
    else if (j >= -3) scoreDelais += 3;
    else if (j >= -7) scoreDelais += 1;
  }
  scoreDelais = Math.min(scoreDelais, 25);

  // 3. Performance financière (30 pts)
  let scorePerformance = 5; // défaut si pas d'objectif
  if (objectifCAannuel > 0) {
    const objectifAjuste = objectifCAannuel * (dayOfYear / 365);
    const ratioPerf = objectifAjuste > 0 ? caAnnuelYTD / objectifAjuste : 1;
    if (ratioPerf >= 1.2) scorePerformance = 30;
    else if (ratioPerf >= 1.05) scorePerformance = 25;
    else if (ratioPerf >= 0.95) scorePerformance = 20;
    else if (ratioPerf >= 0.85) scorePerformance = 15;
    else if (ratioPerf >= 0.75) scorePerformance = 10;
    else scorePerformance = 5;
  } else {
    // Pas d'objectif → score basé sur marge
    if (tauxMarge >= 40) scorePerformance = 25;
    else if (tauxMarge >= 30) scorePerformance = 20;
    else if (tauxMarge >= 20) scorePerformance = 15;
    else scorePerformance = 10;
  }

  // 4. Occupation équipe (15 pts)
  let scoreOccupation = 0;
  if (tauxOccupationMoyen >= 80 && tauxOccupationMoyen <= 95) scoreOccupation = 15;
  else if (tauxOccupationMoyen >= 70) scoreOccupation = 12;
  else if (tauxOccupationMoyen > 95 && tauxOccupationMoyen <= 100) scoreOccupation = 10;
  else if (tauxOccupationMoyen >= 60) scoreOccupation = 8;
  else if (tauxOccupationMoyen > 100 && tauxOccupationMoyen <= 110) scoreOccupation = 5;
  else scoreOccupation = 5;

  const scoreSante = scoreRentabilite + scoreDelais + scorePerformance + scoreOccupation;

  let santeLabel = "Critique";
  let santeColor = "red";
  if (scoreSante >= 85) { santeLabel = "Excellent"; santeColor = "emerald"; }
  else if (scoreSante >= 70) { santeLabel = "Bon"; santeColor = "green"; }
  else if (scoreSante >= 55) { santeLabel = "Moyen"; santeColor = "yellow"; }
  else if (scoreSante >= 40) { santeLabel = "Attention"; santeColor = "orange"; }

  // ── Tendances + prévisions 6 mois ───────────────────────────────
  const tendancesData: {
    mois: string;
    ca: number | null;
    marge: number | null;
    caPrevu: number | null;
    margePrevu: number | null;
    objectif: number | null;
    isFutur: boolean;
  }[] = [];

  // 6 mois passés
  const caLast3: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const moisDate = subMonths(now, i);
    const mDebut = startOfMonth(moisDate);
    const mFin = endOfMonth(moisDate);
    const w: Record<string, unknown> = { date: { gte: mDebut, lte: mFin } };
    if (projetFilter.projetId) w.projetId = projetFilter.projetId;
    const acts = await prisma.activite.findMany({
      where: w,
      select: {
        heures: true,
        facturable: true,
        consultant: { select: { tjm: true, coutJournalierEmployeur: true } },
      },
    });
    const mCA = acts
      .filter((a) => a.facturable)
      .reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
    const mCout = acts.reduce(
      (s, a) => s + coutFn(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0
    );
    caLast3.push(Math.round(mCA));
    tendancesData.push({
      mois: format(moisDate, "MMM yy", { locale: fr }),
      ca: Math.round(mCA),
      marge: Math.round(mCA - mCout),
      caPrevu: null,
      margePrevu: null,
      objectif: objectifCAannuel > 0 ? Math.round(objectifCAannuel / 12) : null,
      isFutur: false,
    });
  }

  // Tendance linéaire basée sur les 3 derniers mois réels
  const derniers3CA = caLast3.slice(-3);
  const moyenneCA3Mois =
    derniers3CA.length > 0
      ? derniers3CA.reduce((s, v) => s + v, 0) / derniers3CA.length
      : 0;
  const pipelineMensuel = pipelineCA > 0 ? Math.round(pipelineCA / 3) : 0;
  const caProjecte = Math.round(moyenneCA3Mois + pipelineMensuel * 0.3);

  // Tendance : pente sur 3 derniers mois
  const slope =
    derniers3CA.length >= 2
      ? (derniers3CA[derniers3CA.length - 1] - derniers3CA[0]) / (derniers3CA.length - 1)
      : 0;

  // 3 mois futurs
  for (let i = 1; i <= 3; i++) {
    const moisDate = addMonths(now, i);
    const caP = Math.max(Math.round(caProjecte + slope * i), 0);
    const margeP = Math.round(caP * (tauxMarge / 100));
    tendancesData.push({
      mois: format(moisDate, "MMM yy", { locale: fr }),
      ca: null,
      marge: null,
      caPrevu: caP,
      margePrevu: margeP,
      objectif: objectifCAannuel > 0 ? Math.round(objectifCAannuel / 12) : null,
      isFutur: true,
    });
  }

  const projectionQ2 = tendancesData
    .filter((d) => d.isFutur)
    .reduce((s, d) => s + (d.caPrevu ?? 0), 0);

  // ── Mois précédent comparaison ────────────────────────────────────
  const moisPrecedent = subMonths(now, 1);
  const mDebPrev = startOfMonth(moisPrecedent);
  const mFinPrev = endOfMonth(moisPrecedent);
  const wPrev: Record<string, unknown> = { date: { gte: mDebPrev, lte: mFinPrev } };
  if (projetFilter.projetId) wPrev.projetId = projetFilter.projetId;
  const actsPrev = await prisma.activite.findMany({
    where: wPrev,
    select: {
      heures: true,
      facturable: true,
      consultant: { select: { tjm: true, coutJournalierEmployeur: true } },
    },
  });
  const caPrev = actsPrev
    .filter((a) => a.facturable)
    .reduce((s, a) => s + CA(Number(a.heures), Number(a.consultant.tjm ?? 0)), 0);
  const coutPrev = actsPrev.reduce(
    (s, a) => s + coutFn(Number(a.heures), Number(a.consultant.coutJournalierEmployeur ?? 0)), 0
  );
  const margePrev = margeFn(caPrev, coutPrev);
  const tauxMargePrev = Math.round(margePct(caPrev, coutPrev) * 10) / 10;

  const variationCA = caPrev > 0 ? Math.round(((caTotal - caPrev) / caPrev) * 1000) / 10 : 0;
  const variationMarge = tauxMarge - tauxMargePrev;
  const variationCout = coutPrev > 0 ? Math.round(((coutTotal - coutPrev) / coutPrev) * 1000) / 10 : 0;

  // ── Réponse ──────────────────────────────────────────────────────
  return NextResponse.json({
    // KPIs financiers période
    kpis: {
      caTotal: Math.round(caTotal),
      coutTotal: Math.round(coutTotal),
      margeBrute: Math.round(margeBrute),
      tauxMarge,
      variationCA,
      variationMarge: Math.round(variationMarge * 10) / 10,
      variationCout,
      roiMoyen:
        projetsAvecProgression.filter((p) => p.cout > 0).length > 0
          ? Math.round(
              projetsAvecProgression
                .filter((p) => p.cout > 0)
                .reduce((s, p) => s + p.roi, 0) /
                projetsAvecProgression.filter((p) => p.cout > 0).length *
                10
            ) / 10
          : 0,
    },

    // Objectifs annuels (YTD)
    objectifsAnnuels: {
      caAnnuelYTD: Math.round(caAnnuelYTD),
      coutAnnuelYTD: Math.round(coutAnnuelYTD),
      margeAnnuelleYTD: Math.round(margeAnnuelleYTD),
      tauxMargeYTD,
      projectionCAannuel,
      pctObjectifCA,
      pctProjectionObjectif,
      dayOfYear,
      pctAnneEcoulee: Math.round((dayOfYear / 365) * 1000) / 10,
    },

    // Projets avec progression complète
    projets: projetsAvecProgression,

    // Donut chart
    donutData,

    // Décomposition consultants
    decompositionConsultants,
    totalCAConsultants: Math.round(totalCAConsultants),

    // Capacité équipe
    capacite: {
      tauxOccupationMoyen,
      consultants: consultantsOccupation,
      joursHommeDisponibles,
      capaciteDisponibleHeures: Math.round(capaciteDisponibleHeures),
      besoinRecrutement,
      pipelineCA: Math.round(pipelineCA),
    },

    // Score santé globale
    santéGlobale: {
      score: scoreSante,
      label: santeLabel,
      color: santeColor,
      detail: {
        rentabilite: { score: scoreRentabilite, max: 30, ratioMoyen: Math.round(ratioMoyenCA) },
        delais: { score: scoreDelais, max: 25, projetsEvalues: projetsEnCours.length },
        performance: { score: scorePerformance, max: 30, tauxMarge },
        occupation: { score: scoreOccupation, max: 15, tauxOccupation: tauxOccupationMoyen },
      },
    },

    // Tendances + prévisions
    tendances: tendancesData,
    projectionQ2: Math.round(projectionQ2),
    moyenneCA3Mois: Math.round(moyenneCA3Mois),

    // Stats générales
    stats: {
      nbProjetsTotal: projetsAll.length,
      nbProjetsEnCours: projetsAll.filter((p) => p.statut === "EN_COURS").length,
      nbProjetsPlanifie: projetsAll.filter((p) => p.statut === "PLANIFIE").length,
      nbProjetsTermine: projetsAll.filter((p) => p.statut === "TERMINE").length,
      nbConsultants: consultantsActifs.length,
    },
  });
}
