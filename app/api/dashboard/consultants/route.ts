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
  addDays,
  isWeekend,
} from "date-fns";
import { fr } from "date-fns/locale";
import { calculerProgression } from "@/lib/projet-metrics";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/dashboard/consultants?consultantId=X&periode=mois|trimestre|annee
export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const consultantIdParam = searchParams.get("consultantId");
  const periode = searchParams.get("periode") ?? "mois";

  const now = new Date();

  // ── Période ──────────────────────────────────────────────────────────
  let debut: Date;
  let fin: Date;

  if (periode === "trimestre") {
    const moisTrimestre = Math.floor(now.getMonth() / 3) * 3;
    debut = new Date(now.getFullYear(), moisTrimestre, 1);
    fin = new Date(now.getFullYear(), moisTrimestre + 3, 0, 23, 59, 59, 999);
  } else if (periode === "annee") {
    debut = new Date(now.getFullYear(), 0, 1);
    fin = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    // mois
    debut = startOfMonth(now);
    fin = endOfMonth(now);
    fin.setHours(23, 59, 59, 999);
  }

  // Mois précédent (pour variation)
  const debutPrev = startOfMonth(subMonths(now, 1));
  const finPrev = endOfMonth(subMonths(now, 1));
  finPrev.setHours(23, 59, 59, 999);

  // ── Consultants liste (pour selector) ────────────────────────────────
  const consultantsList = await prisma.consultant.findMany({
    where: { actif: true },
    select: { id: true, nom: true, couleur: true, tjm: true },
    orderBy: { nom: "asc" },
  });

  if (consultantsList.length === 0) {
    return NextResponse.json({ consultants: [], data: null });
  }

  // Consultant sélectionné (défaut = premier)
  const consultantId = consultantIdParam
    ? parseInt(consultantIdParam)
    : consultantsList[0].id;

  // ── Données consultant ────────────────────────────────────────────────
  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    select: {
      id: true,
      nom: true,
      email: true,
      tjm: true,
      coutJournalierEmployeur: true,
      couleur: true,
      competences: true,
    },
  });

  if (!consultant) {
    return NextResponse.json({ consultants: consultantsList, data: null });
  }

  // ── Requêtes parallèles ──────────────────────────────────────────────
  const [activitesPeriode, activitesPrev, activitesRecentes, projetsAvecEtapes] =
    await Promise.all([
      // Activités de la période sélectionnée
      prisma.activite.findMany({
        where: { consultantId, date: { gte: debut, lte: fin } },
        select: {
          id: true,
          date: true,
          heures: true,
          facturable: true,
          description: true,
          etapeId: true,
          projet: { select: { id: true, nom: true, client: true, couleur: true } },
          etape: { select: { id: true, nom: true } },
        },
        orderBy: { date: "desc" },
      }),

      // Activités mois précédent (pour variations)
      prisma.activite.findMany({
        where: { consultantId, date: { gte: debutPrev, lte: finPrev } },
        select: { heures: true, facturable: true },
      }),

      // 20 activités récentes (toutes périodes)
      prisma.activite.findMany({
        where: { consultantId },
        select: {
          id: true,
          date: true,
          heures: true,
          facturable: true,
          description: true,
          projet: { select: { id: true, nom: true, client: true, couleur: true } },
          etape: { select: { id: true, nom: true } },
        },
        orderBy: { date: "desc" },
        take: 50,
      }),

      // Projets avec étapes pour deadlines + planning
      prisma.projet.findMany({
        where: {
          statut: { in: ["EN_COURS", "PLANIFIE"] },
          activites: { some: { consultantId } },
        },
        include: {
          etapes: {
            where: { statut: { not: "VALIDEE" } },
            select: {
              id: true,
              nom: true,
              statut: true,
              deadline: true,
              dateDebut: true,
              chargeEstimeeJours: true,
              ordre: true,
            },
            orderBy: { deadline: "asc" },
          },
          activites: {
            select: {
              heures: true,
              facturable: true,
              date: true,
              etapeId: true,
              consultant: { select: { id: true, tjm: true, coutJournalierEmployeur: true } },
            },
          },
        },
      }),
    ]);

  // ── KPIs période ─────────────────────────────────────────────────────
  const tjm = Number(consultant.tjm ?? 0);
  const heuresTotal = activitesPeriode.reduce((s, a) => s + Number(a.heures), 0);
  const heuresBill = activitesPeriode.filter((a) => a.facturable).reduce((s, a) => s + Number(a.heures), 0);
  const caGenere = (heuresBill / 8) * tjm;

  const heuresPrev = activitesPrev.reduce((s, a) => s + Number(a.heures), 0);
  const caGenerePrev =
    (activitesPrev.filter((a) => a.facturable).reduce((s, a) => s + Number(a.heures), 0) / 8) * tjm;

  const variationHeures = Math.round(heuresTotal - heuresPrev);
  const variationCA =
    caGenerePrev > 0 ? Math.round(((caGenere - caGenerePrev) / caGenerePrev) * 1000) / 10 : 0;

  // Jours ouvrables de la période
  let joursOuvrables = 0;
  let cursor = new Date(debut);
  while (cursor <= fin) {
    if (!isWeekend(cursor)) joursOuvrables++;
    cursor = addDays(cursor, 1);
  }
  const tauxOccupation =
    joursOuvrables > 0 ? Math.round((heuresTotal / (joursOuvrables * 8)) * 1000) / 10 : 0;

  // Projets distincts avec activités ce mois
  const projetIdsActifs = [...new Set(activitesPeriode.map((a) => a.projet.id))];
  const projetsActifsList = projetIdsActifs.map((pid) => {
    const acts = activitesPeriode.filter((a) => a.projet.id === pid);
    return {
      id: pid,
      nom: acts[0].projet.nom,
      client: acts[0].projet.client,
      couleur: acts[0].projet.couleur,
      heures: Math.round(acts.reduce((s, a) => s + Number(a.heures), 0) * 10) / 10,
    };
  }).sort((a, b) => b.heures - a.heures);

  // ── Projets en cours avec progression ───────────────────────────────
  const projetsEnCours = projetsAvecEtapes.map((p) => {
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

    // Heures loguées par ce consultant sur ce projet
    const heuresConsultant = activitesPeriode
      .filter((a) => a.projet.id === p.id)
      .reduce((s, a) => s + Number(a.heures), 0);

    return {
      id: p.id,
      nom: p.nom,
      client: p.client,
      statut: p.statut,
      couleur: p.couleur,
      heuresConsultant: Math.round(heuresConsultant * 10) / 10,
      budgetConsommePct: prog.budgetConsommePct,
      realisationPct: prog.realisationPct,
      ecart: prog.ecart,
      health: prog.health,
    };
  }).sort((a, b) => b.heuresConsultant - a.heuresConsultant);

  // ── Deadlines à venir ────────────────────────────────────────────────
  const deadlines = projetsAvecEtapes.flatMap((p) =>
    p.etapes
      .filter((e) => e.deadline)
      .map((e) => ({
        etapeId: e.id,
        etapeNom: e.nom,
        statut: e.statut,
        projetId: p.id,
        projetNom: p.nom,
        projetCouleur: p.couleur,
        deadline: e.deadline!,
        joursRestants: differenceInDays(new Date(e.deadline!), now),
        chargeEstimeeJours: e.chargeEstimeeJours,
      }))
  )
    .sort((a, b) => a.joursRestants - b.joursRestants)
    .slice(0, 5);

  // ── Planning semaine ─────────────────────────────────────────────────
  const debutSemaine = startOfWeek(now, { weekStartsOn: 1 }); // lundi
  const finSemaine = endOfWeek(now, { weekStartsOn: 1 }); // dimanche

  // Activités réelles sur cette semaine
  const activitesSemaine = await prisma.activite.findMany({
    where: {
      consultantId,
      date: { gte: debutSemaine, lte: finSemaine },
    },
    select: {
      date: true,
      heures: true,
      projet: { select: { id: true, nom: true, couleur: true } },
      etape: { select: { id: true, nom: true } },
    },
    orderBy: { date: "asc" },
  });

  const planningSemaine = [];
  for (let i = 0; i < 7; i++) {
    const jour = addDays(debutSemaine, i);
    const jourStr = format(jour, "yyyy-MM-dd");
    const isWE = isWeekend(jour);

    const actsJour = activitesSemaine.filter(
      (a) => format(new Date(a.date), "yyyy-MM-dd") === jourStr
    );
    const totalHeures = actsJour.reduce((s, a) => s + Number(a.heures), 0);

    // Grouper par projet
    const parProjet: Record<number, { nom: string; couleur: string; heures: number; etape: string | null }> = {};
    for (const act of actsJour) {
      const pid = act.projet.id;
      if (!parProjet[pid]) {
        parProjet[pid] = { nom: act.projet.nom, couleur: act.projet.couleur, heures: 0, etape: act.etape?.nom ?? null };
      }
      parProjet[pid].heures += Number(act.heures);
    }

    planningSemaine.push({
      date: jour.toISOString(),
      jourLabel: format(jour, "EEEE d MMMM", { locale: fr }),
      isWeekend: isWE,
      totalHeures: Math.round(totalHeures * 10) / 10,
      projets: Object.values(parProjet).map((p) => ({
        ...p,
        heures: Math.round(p.heures * 10) / 10,
      })),
    });
  }

  // ── Historique 6 mois ────────────────────────────────────────────────
  const historique6Mois = [];
  for (let i = 5; i >= 0; i--) {
    const moisDate = subMonths(now, i);
    const mDebut = startOfMonth(moisDate);
    const mFin = endOfMonth(moisDate);

    const acts = await prisma.activite.findMany({
      where: { consultantId, date: { gte: mDebut, lte: mFin } },
      select: { heures: true, facturable: true },
    });

    // Jours ouvrables du mois
    let joursMois = 0;
    let c = new Date(mDebut);
    while (c <= mFin) {
      if (!isWeekend(c)) joursMois++;
      c = addDays(c, 1);
    }

    const hTotal = acts.reduce((s, a) => s + Number(a.heures), 0);
    const hBill = acts.filter((a) => a.facturable).reduce((s, a) => s + Number(a.heures), 0);
    const caMois = (hBill / 8) * tjm;
    const tauxMois = joursMois > 0 ? Math.round((hTotal / (joursMois * 8)) * 1000) / 10 : 0;

    historique6Mois.push({
      mois: format(moisDate, "MMM yy", { locale: fr }),
      heures: Math.round(hTotal * 10) / 10,
      ca: Math.round(caMois),
      occupation: tauxMois,
    });
  }

  const moy6Heures =
    historique6Mois.reduce((s, m) => s + m.heures, 0) / historique6Mois.length;
  const moy6CA = historique6Mois.reduce((s, m) => s + m.ca, 0) / historique6Mois.length;
  const moy6Occ = historique6Mois.reduce((s, m) => s + m.occupation, 0) / historique6Mois.length;

  // Tendance globale (derniers 3 vs premiers 3)
  const moy3Debut =
    historique6Mois.slice(0, 3).reduce((s, m) => s + m.ca, 0) / 3;
  const moy3Fin =
    historique6Mois.slice(3).reduce((s, m) => s + m.ca, 0) / 3;
  const tendanceGlobale =
    moy3Fin > moy3Debut * 1.05
      ? "hausse"
      : moy3Fin < moy3Debut * 0.95
      ? "baisse"
      : "stable";

  // ── Activités récentes paginées ──────────────────────────────────────
  const heuresBillRecentes = activitesRecentes.filter((a) => a.facturable).reduce((s, a) => s + Number(a.heures), 0);
  const heuresTotalesRecentes = activitesRecentes.reduce((s, a) => s + Number(a.heures), 0);

  return NextResponse.json({
    consultants: consultantsList,
    consultant: {
      ...consultant,
      tjm: Number(consultant.tjm ?? 0),
      coutJournalierEmployeur: Number(consultant.coutJournalierEmployeur ?? 0),
    },

    // KPIs
    kpis: {
      heuresTotal: Math.round(heuresTotal * 10) / 10,
      heuresBill: Math.round(heuresBill * 10) / 10,
      caGenere: Math.round(caGenere),
      tauxOccupation,
      joursOuvrables,
      variationHeures,
      variationCA,
      nbProjetsActifs: projetIdsActifs.length,
      projetsActifsList,
    },

    // Projets en cours
    projetsEnCours,

    // Deadlines à venir
    deadlines,

    // Planning semaine
    planningSemaine,

    // Historique 6 mois
    historique: {
      data: historique6Mois,
      moy6Heures: Math.round(moy6Heures * 10) / 10,
      moy6CA: Math.round(moy6CA),
      moy6Occ: Math.round(moy6Occ * 10) / 10,
      tendanceGlobale,
    },

    // Activités récentes
    activitesRecentes: activitesRecentes.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      projetId: a.projet.id,
      projetNom: a.projet.nom,
      projetCouleur: a.projet.couleur,
      etapeNom: a.etape?.nom ?? null,
      heures: Number(a.heures),
      facturable: a.facturable,
      description: a.description,
    })),
    totalHeuresToutes: Math.round(heuresTotalesRecentes * 10) / 10,
    totalHeuresBill: Math.round(heuresBillRecentes * 10) / 10,
  });
}
