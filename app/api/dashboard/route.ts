import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { differenceInDays, subDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { calculerProgression } from "@/lib/projet-metrics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");
  const consultantId = searchParams.get("consultantId");
  const projetId = searchParams.get("projetId");

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

  // ── Build activity where clause ───────────────────────────────
  const whereActivites: Record<string, unknown> = {
    date: { gte: debut, lte: fin },
  };
  if (consultantId) whereActivites.consultantId = parseInt(consultantId);
  if (projetId) whereActivites.projetId = parseInt(projetId);

  // ── Parallel queries ──────────────────────────────────────────
  const [
    consultantsActifs,
    projetsEnCours,
    heuresAgg,
    prochaineEtape,
    heuresParConsultantRaw,
    activitesPeriode,
    dernieresActivites,
    prochainesDeadlines,
    activitesFinance,
    projetsActifsAlertes,
  ] = await Promise.all([
    // KPI 1: Consultants actifs
    prisma.consultant.count({ where: { actif: true } }),

    // KPI 2: Projets en cours
    prisma.projet.count({ where: { statut: "EN_COURS" } }),

    // KPI 3: Heures facturables de la période
    prisma.activite.aggregate({
      _sum: { heures: true },
      where: { ...whereActivites, facturable: true },
    }),

    // KPI 4: Prochaine deadline
    prisma.etape.findFirst({
      where: {
        statut: { not: "VALIDEE" },
        deadline: { gte: now },
      },
      include: { projet: true },
      orderBy: { deadline: "asc" },
    }),

    // Chart 1: Heures par consultant sur la période
    prisma.activite.groupBy({
      by: ["consultantId"],
      _sum: { heures: true },
      where: whereActivites,
    }),

    // Chart 2: Activités de la période pour évolution quotidienne
    prisma.activite.findMany({
      where: whereActivites,
      select: { date: true, heures: true },
    }),

    // List 1: 5 dernières activités de la période
    prisma.activite.findMany({
      where: whereActivites,
      take: 5,
      orderBy: { date: "desc" },
      include: {
        consultant: { select: { nom: true } },
        projet: { select: { nom: true } },
      },
    }),

    // List 2: 5 prochaines deadlines
    prisma.etape.findMany({
      where: {
        statut: { not: "VALIDEE" },
        deadline: { not: null },
      },
      take: 5,
      orderBy: { deadline: "asc" },
      include: { projet: { select: { nom: true } } },
    }),

    // Finance: activités de la période avec données consultant
    prisma.activite.findMany({
      where: whereActivites,
      select: {
        heures: true,
        facturable: true,
        consultant: { select: { tjm: true, coutJournalierEmployeur: true } },
      },
    }),

    // Alertes: projets actifs (with progression data)
    prisma.projet.findMany({
      where: { statut: { in: ["EN_COURS", "PLANIFIE"] } },
      include: {
        etapes: {
          select: { id: true, nom: true, deadline: true, statut: true, chargeEstimeeJours: true },
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
  ]);

  // ── Enrich chart data ─────────────────────────────────────────
  const consultantIds = heuresParConsultantRaw.map((h) => h.consultantId);
  const consultants = await prisma.consultant.findMany({
    where: { id: { in: consultantIds } },
    select: { id: true, nom: true },
  });
  const consultantMap = new Map(consultants.map((c) => [c.id, c.nom]));

  const chartConsultants = heuresParConsultantRaw.map((h) => ({
    nom: consultantMap.get(h.consultantId) ?? "Inconnu",
    heures: Number(h._sum.heures ?? 0),
  }));

  // ── Evolution par jour ────────────────────────────────────────
  const heuresParJour = new Map<string, number>();
  // Fill 7 days back from fin
  const displayDays = Math.min(7, Math.ceil((fin.getTime() - debut.getTime()) / 86400000) + 1);
  for (let i = displayDays - 1; i >= 0; i--) {
    const d = subDays(fin, i);
    heuresParJour.set(format(d, "yyyy-MM-dd"), 0);
  }
  for (const a of activitesPeriode) {
    const key = format(new Date(a.date), "yyyy-MM-dd");
    if (heuresParJour.has(key)) {
      heuresParJour.set(key, (heuresParJour.get(key) ?? 0) + Number(a.heures));
    }
  }
  const chartEvolution = Array.from(heuresParJour.entries()).map(
    ([dateStr, heures]) => ({
      date: format(new Date(dateStr), "dd MMM", { locale: fr }),
      heures,
    })
  );

  // ── KPIs ──────────────────────────────────────────────────────
  const totalHeures = Number(heuresAgg._sum.heures ?? 0);

  const deadlineJours = prochaineEtape?.deadline
    ? differenceInDays(new Date(prochaineEtape.deadline), now)
    : null;

  // Finance
  const caFacturable = activitesFinance
    .filter((a) => a.facturable)
    .reduce((sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);
  const coutReel = activitesFinance.reduce(
    (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0
  );
  const marge = caFacturable - coutReel;
  const tauxMarge = caFacturable > 0 ? Math.round((marge / caFacturable) * 1000) / 10 : 0;

  // ── Alertes ───────────────────────────────────────────────────
  interface AlerteItem {
    id: string;
    type: string;
    severite: string;
    titre: string;
    description: string;
    projetId: number;
    projetNom: string;
    valeur?: number;
  }
  const alertes: AlerteItem[] = [];
  for (const p of projetsActifsAlertes) {
    const budget = Number(p.budget ?? 0);
    const ca = p.activites.reduce(
      (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0
    );
    const cr = p.activites.reduce(
      (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0
    );
    const m = ca - cr;
    const pct = budget > 0 ? Math.round((ca / budget) * 100) : 0;

    if (budget > 0 && pct > 100) {
      alertes.push({
        id: `budget-depasse-${p.id}`, type: "budget_depasse", severite: "critique",
        titre: "Budget dépassé", description: `${pct}% du budget consommé`,
        projetId: p.id, projetNom: p.nom, valeur: pct,
      });
    } else if (budget > 0 && pct >= 80) {
      alertes.push({
        id: `budget-eleve-${p.id}`, type: "budget_eleve", severite: "attention",
        titre: "Budget presque atteint", description: `${pct}% du budget consommé`,
        projetId: p.id, projetNom: p.nom, valeur: pct,
      });
    }
    if (ca > 0 && m < 0) {
      alertes.push({
        id: `marge-neg-${p.id}`, type: "marge_negative", severite: "critique",
        titre: "Marge négative", description: `Marge de ${Math.round(m).toLocaleString("fr-FR")} \u20AC`,
        projetId: p.id, projetNom: p.nom, valeur: Math.round(m),
      });
    }
    for (const e of p.etapes) {
      if (!e.deadline) continue;
      const jours = differenceInDays(new Date(e.deadline), now);
      if (jours < 0) {
        alertes.push({
          id: `deadline-depassee-${e.id}`, type: "deadline_depassee", severite: "critique",
          titre: "Deadline dépassée", description: `Étape "${e.nom}" en retard de ${Math.abs(jours)}j`,
          projetId: p.id, projetNom: p.nom, valeur: jours,
        });
      } else if (jours <= 7) {
        alertes.push({
          id: `deadline-proche-${e.id}`, type: "deadline_proche", severite: "attention",
          titre: "Deadline imminente", description: `Étape "${e.nom}" dans ${jours}j`,
          projetId: p.id, projetNom: p.nom, valeur: jours,
        });
      }
    }
  }
  const severityOrder: Record<string, number> = { critique: 0, attention: 1, info: 2 };
  alertes.sort((a, b) => (severityOrder[a.severite] ?? 2) - (severityOrder[b.severite] ?? 2));

  // ── Projets en dérive (progression) ──────────────────────────
  const projetsDerive = projetsActifsAlertes
    .map((p) => {
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
      return {
        id: p.id,
        nom: p.nom,
        budgetPct: prog.budgetConsommePct,
        realisationPct: prog.realisationPct,
        ecart: prog.ecart,
        health: prog.health,
        healthLabel: prog.healthLabel,
        dateFinEstimee: prog.dateFinEstimee,
      };
    })
    .filter((p) => p.ecart < -5 || p.budgetPct > 0) // Only projects with some data
    .sort((a, b) => a.ecart - b.ecart) // Worst first
    .slice(0, 5);

  // ── Format response ───────────────────────────────────────────
  return NextResponse.json({
    consultantsActifs,
    projetsEnCours,
    totalHeures,
    caFacturable,
    coutReel,
    marge,
    tauxMarge,
    prochaineEtape: prochaineEtape
      ? {
          nom: prochaineEtape.nom,
          projetNom: prochaineEtape.projet.nom,
          deadline: prochaineEtape.deadline,
          joursRestants: deadlineJours,
        }
      : null,
    chartConsultants,
    chartEvolution,
    dernieresActivites: dernieresActivites.map((a) => ({
      id: a.id,
      date: a.date,
      heures: Number(a.heures),
      consultant: a.consultant.nom,
      projet: a.projet.nom,
    })),
    prochainesDeadlines: prochainesDeadlines.map((e) => ({
      id: e.id,
      nom: e.nom,
      statut: e.statut,
      deadline: e.deadline,
      projetNom: e.projet.nom,
      joursRestants: e.deadline ? differenceInDays(new Date(e.deadline), now) : null,
    })),
    alertes,
    projetsDerive,
  });
}
