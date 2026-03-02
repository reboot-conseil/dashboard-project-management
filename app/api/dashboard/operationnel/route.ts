import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  differenceInDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  startOfWeek,
  endOfWeek,
  subDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import { calculerProgression } from "@/lib/projet-metrics";

// GET /api/dashboard/operationnel?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD&projetId=X
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");
  const projetIdParam = searchParams.get("projetId");

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

  // Filtre activités selon période + projet optionnel
  const whereActivites: Record<string, unknown> = { date: { gte: debut, lte: fin } };
  if (projetIdParam && projetIdParam !== "all") {
    whereActivites.projetId = parseInt(projetIdParam);
  }

  // ── Requêtes parallèles ──────────────────────────────────────────
  const [
    consultantsActifs,
    projetsActifs,
    activitesPeriode,
    activites7Jours,
    etapesCritiques,
  ] = await Promise.all([
    // Consultants actifs avec leurs activités de la période
    prisma.consultant.findMany({
      where: { actif: true },
      select: {
        id: true,
        nom: true,
        couleur: true,
        tjm: true,
        coutJournalierEmployeur: true,
        activites: {
          where: whereActivites,
          select: { heures: true, facturable: true, date: true },
        },
      },
    }),

    // Projets actifs avec toutes données de progression
    prisma.projet.findMany({
      where: { statut: { in: ["EN_COURS", "PLANIFIE"] } },
      include: {
        etapes: {
          select: {
            id: true,
            nom: true,
            statut: true,
            deadline: true,
            chargeEstimeeJours: true,
            ordre: true,
          },
          orderBy: { ordre: "asc" },
        },
        activites: {
          select: {
            heures: true,
            facturable: true,
            date: true,
            etapeId: true,
            consultant: { select: { tjm: true, coutJournalierEmployeur: true } },
          },
        },
      },
    }),

    // Activités de la période filtrée (pour KPIs financiers)
    prisma.activite.findMany({
      where: whereActivites,
      select: {
        heures: true,
        facturable: true,
        date: true,
        consultant: { select: { id: true, nom: true, tjm: true, coutJournalierEmployeur: true } },
      },
    }),

    // Activités des 7 derniers jours (pour graphique équipe - toujours 7j)
    prisma.activite.findMany({
      where: {
        date: { gte: subDays(now, 6) },
        ...(projetIdParam && projetIdParam !== "all"
          ? { projetId: parseInt(projetIdParam) }
          : {}),
      },
      select: {
        heures: true,
        date: true,
        consultant: { select: { id: true, nom: true, couleur: true } },
      },
    }),

    // Étapes critiques (deadline < 3j, non validées)
    prisma.etape.findMany({
      where: {
        statut: { not: "VALIDEE" },
        deadline: { not: null, gte: now },
      },
      select: {
        id: true,
        nom: true,
        deadline: true,
        statut: true,
        projet: { select: { id: true, nom: true } },
      },
      orderBy: { deadline: "asc" },
    }),
  ]);

  // ── KPIs financiers période ──────────────────────────────────────
  const caTotal = activitesPeriode
    .filter((a) => a.facturable)
    .reduce((s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);
  const coutTotal = activitesPeriode.reduce(
    (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0
  );
  const margeBrute = caTotal - coutTotal;
  const tauxMarge = caTotal > 0 ? Math.round((margeBrute / caTotal) * 1000) / 10 : 0;
  const totalHeures = activitesPeriode.reduce((s, a) => s + Number(a.heures), 0);

  // ── Taux d'occupation consultants (période filtrée) ──────────────
  const totalJours = Math.max(
    Math.ceil((fin.getTime() - debut.getTime()) / 86400000) + 1,
    1
  );
  const joursOuvres = Math.round(totalJours * 5 / 7);
  const capaciteTheorique = consultantsActifs.length * joursOuvres * 8;
  const tauxOccupation = capaciteTheorique > 0
    ? Math.round((totalHeures / capaciteTheorique) * 1000) / 10
    : 0;

  // ── Progression projets + alertes ───────────────────────────────
  const projetsAvecProgression = projetsActifs.map((p) => {
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

    const budget = Number(p.budget ?? 0);
    const caProjet = p.activites
      .filter((a) => a.facturable)
      .reduce((s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);
    const pctBudget = budget > 0 ? Math.round((caProjet / budget) * 1000) / 10 : 0;

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
      prochainDeadline: prochainDeadline
        ? {
            nom: prochainDeadline.nom,
            deadline: prochainDeadline.deadline,
            joursRestants: joursDeadline,
          }
        : null,
    };
  });

  // ── Priorités cette semaine ──────────────────────────────────────
  // 1. Deadlines critiques (< 3j)
  const deadlinesCritiques = etapesCritiques.filter((e) => {
    const j = differenceInDays(new Date(e.deadline!), now);
    return j >= 0 && j < 3;
  });

  // 2. Projets en dérive (écart < -10%)
  const projetsEnDerive = projetsAvecProgression.filter((p) => p.ecart < -10);

  // 3. Points clients (budget > 95%)
  const pointsClients = projetsAvecProgression.filter((p) => p.pctBudget > 95);

  // 4. Staffing
  const sousSollicites = consultantsActifs.filter((c) => {
    const heures = c.activites.reduce((s, a) => s + Number(a.heures), 0);
    const pct = capaciteTheorique > 0 ? (heures / (joursOuvres * 8)) * 100 : 0;
    return pct < 60;
  });
  const surSollicites = consultantsActifs.filter((c) => {
    const heures = c.activites.reduce((s, a) => s + Number(a.heures), 0);
    const pct = joursOuvres > 0 ? (heures / (joursOuvres * 8)) * 100 : 0;
    return pct > 100;
  });

  // ── Projets à surveiller (top 5 les plus critiques) ─────────────
  const projetsASurveiller = projetsAvecProgression
    .filter((p) => {
      const joursD = p.prochainDeadline?.joursRestants;
      return (
        p.ecart < -10 ||
        p.pctBudget > 95 ||
        (joursD !== null && joursD !== undefined && joursD < 7)
      );
    })
    .sort((a, b) => {
      // Score criticité : écart négatif + budget élevé
      const scoreA = Math.abs(Math.min(a.ecart, 0)) * 2 + Math.max(a.pctBudget - 80, 0);
      const scoreB = Math.abs(Math.min(b.ecart, 0)) * 2 + Math.max(b.pctBudget - 80, 0);
      return scoreB - scoreA;
    })
    .slice(0, 5);

  // ── Graphique Activité Équipe (7 derniers jours) ─────────────────
  // Construire structure jour × consultant
  const jours7: string[] = [];
  for (let i = 6; i >= 0; i--) {
    jours7.push(subDays(now, i).toISOString().split("T")[0]);
  }

  // Palette pastel consultants
  const CONSULTANT_COLORS = [
    "#dbeafe", // bleu pastel
    "#d1fae5", // vert pastel
    "#fed7aa", // orange pastel
    "#e9d5ff", // violet pastel
    "#fecdd3", // rose pastel
    "#fef3c7", // jaune pastel
  ];

  // Map consultant id → index couleur
  const consultantColorMap = new Map(
    consultantsActifs.map((c, i) => [c.id, CONSULTANT_COLORS[i % CONSULTANT_COLORS.length]])
  );

  // Agréger heures par jour + consultant
  const heuresParJourConsultant: Record<string, Record<number, number>> = {};
  for (const jour of jours7) {
    heuresParJourConsultant[jour] = {};
  }
  for (const a of activites7Jours) {
    const jour = a.date.toISOString().split("T")[0];
    if (!heuresParJourConsultant[jour]) continue;
    const cId = a.consultant.id;
    heuresParJourConsultant[jour][cId] = (heuresParJourConsultant[jour][cId] ?? 0) + Number(a.heures);
  }

  const activiteEquipeData = jours7.map((jour) => {
    const row: Record<string, unknown> = {
      jour: format(new Date(jour), "EEE dd/MM", { locale: fr }),
      total: 0,
    };
    let total = 0;
    for (const c of consultantsActifs) {
      const h = Math.round((heuresParJourConsultant[jour][c.id] ?? 0) * 10) / 10;
      row[c.nom] = h;
      total += h;
    }
    row.total = Math.round(total * 10) / 10;
    return row;
  });

  const consultantsChart = consultantsActifs.map((c, i) => ({
    id: c.id,
    nom: c.nom,
    couleur: CONSULTANT_COLORS[i % CONSULTANT_COLORS.length],
  }));

  // ── Tendances 6 mois ─────────────────────────────────────────────
  const tendances6Mois: { mois: string; ca: number; marge: number; heures: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const moisDate = subMonths(now, i);
    const mDebut = startOfMonth(moisDate);
    const mFin = endOfMonth(moisDate);

    const where6m: Record<string, unknown> = { date: { gte: mDebut, lte: mFin } };
    if (projetIdParam && projetIdParam !== "all") {
      where6m.projetId = parseInt(projetIdParam);
    }

    const moisActivites = await prisma.activite.findMany({
      where: where6m,
      select: {
        heures: true,
        facturable: true,
        consultant: { select: { tjm: true, coutJournalierEmployeur: true } },
      },
    });

    const mCA = moisActivites
      .filter((a) => a.facturable)
      .reduce((s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);
    const mCout = moisActivites.reduce(
      (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0
    );
    const mHeures = moisActivites.reduce((s, a) => s + Number(a.heures), 0);

    tendances6Mois.push({
      mois: format(moisDate, "MMM yy", { locale: fr }),
      ca: Math.round(mCA),
      marge: Math.round(mCA - mCout),
      heures: Math.round(mHeures),
    });
  }

  // ── Décalage planning (projets en retard ou proches) ─────────────
  const projetsEnRetard = projetsAvecProgression.filter((p) => {
    const j = p.prochainDeadline?.joursRestants;
    return j !== null && j !== undefined && j < 0;
  });
  const projetsCritiquesPlanning = projetsAvecProgression.filter((p) => {
    const j = p.prochainDeadline?.joursRestants;
    return j !== null && j !== undefined && j >= 0 && j < 7;
  });

  // ── Projets budget dépassé ───────────────────────────────────────
  const projetsBudgetDepasse = projetsAvecProgression.filter((p) => p.pctBudget > 100);
  const projetsBudgetCritique = projetsAvecProgression.filter(
    (p) => p.pctBudget > 95 && p.pctBudget <= 100
  );

  // ── Réponse ──────────────────────────────────────────────────────
  return NextResponse.json({
    // KPIs financiers
    kpis: {
      caTotal: Math.round(caTotal),
      coutTotal: Math.round(coutTotal),
      margeBrute: Math.round(margeBrute),
      tauxMarge,
      totalHeures: Math.round(totalHeures * 10) / 10,
      tauxOccupation,
      // Planning
      nbProjetsEnRetard: projetsEnRetard.length,
      nbProjetsCritiquesPlanning: projetsCritiquesPlanning.length,
      // Budget
      nbProjetsBudgetDepasse: projetsBudgetDepasse.length,
      nbProjetsBudgetCritique: projetsBudgetCritique.length,
    },

    // Priorités semaine
    priorites: {
      deadlinesCritiques: deadlinesCritiques.map((e) => ({
        id: e.id,
        nom: e.nom,
        deadline: e.deadline,
        joursRestants: differenceInDays(new Date(e.deadline!), now),
        projetId: e.projet.id,
        projetNom: e.projet.nom,
      })),
      projetsEnDerive: projetsEnDerive.map((p) => ({
        id: p.id,
        nom: p.nom,
        ecart: p.ecart,
      })),
      pointsClients: pointsClients.map((p) => ({
        id: p.id,
        nom: p.nom,
        pctBudget: p.pctBudget,
      })),
      staffing: {
        sousSollicites: sousSollicites.map((c) => ({ id: c.id, nom: c.nom })),
        surSollicites: surSollicites.map((c) => ({ id: c.id, nom: c.nom })),
      },
    },

    // Projets à surveiller
    projetsASurveiller,

    // Graphique activité équipe (7 derniers jours)
    activiteEquipe: {
      data: activiteEquipeData,
      consultants: consultantsChart,
    },

    // Tendances 6 mois
    tendances6Mois,

    // Consultants stats
    consultants: consultantsActifs.map((c, i) => ({
      id: c.id,
      nom: c.nom,
      couleur: CONSULTANT_COLORS[i % CONSULTANT_COLORS.length],
      heuresPeriode: Math.round(c.activites.reduce((s, a) => s + Number(a.heures), 0) * 10) / 10,
      tauxOccupation:
        joursOuvres > 0
          ? Math.round(
              (c.activites.reduce((s, a) => s + Number(a.heures), 0) / (joursOuvres * 8)) * 1000
            ) / 10
          : 0,
    })),
  });
}
