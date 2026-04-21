import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { eachDayOfInterval, isWeekend, parseISO } from "date-fns";
import { HEURES_PAR_JOUR } from "@/lib/financial";

// Palette couleurs consultants (différente des projets)
const CONSULTANT_COLORS = [
  "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316",
];
function getConsultantColor(id: number, couleur?: string | null): string {
  if (couleur && couleur !== "#8B5CF6") return couleur;
  return CONSULTANT_COLORS[id % CONSULTANT_COLORS.length];
}

function getBusinessDays(start: Date, end: Date): number {
  const days = eachDayOfInterval({ start, end });
  return Math.max(1, days.filter((d) => !isWeekend(d)).length);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");

  // Filtres avancés
  const consultantIds = searchParams.getAll("consultantIds[]").map(Number).filter(Boolean);
  const projetIds = searchParams.getAll("projetIds[]").map(Number).filter(Boolean);
  const statuts = searchParams.getAll("statuts[]");
  const urgences = searchParams.getAll("urgences[]");
  const includePassees = searchParams.get("includePassees") === "true";
  // Compat ancien filtre simple
  const consultantId = searchParams.get("consultantId");

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
  now.setHours(0, 0, 0, 0);

  // Build activités where clause
  const whereActivites: Record<string, unknown> = {
    date: { gte: debut, lte: fin },
  };
  const effectiveConsultantIds = consultantIds.length > 0
    ? consultantIds
    : consultantId ? [parseInt(consultantId)] : [];
  if (effectiveConsultantIds.length > 0) {
    whereActivites.consultantId = { in: effectiveConsultantIds };
  }
  if (projetIds.length > 0) {
    whereActivites.projetId = { in: projetIds };
  }

  // Build etapes where clause - large range pour vue Gantt/Charge
  // On récupère les étapes qui chevauchent la période
  const whereEtapes: Record<string, unknown> = {
    OR: [
      // Deadline dans la période
      { deadline: { gte: debut, lte: fin } },
      // Début dans la période
      { dateDebut: { gte: debut, lte: fin } },
      // L'étape chevauche la période (dateDebut avant début ET deadline après fin)
      {
        AND: [
          { dateDebut: { lte: debut } },
          { deadline: { gte: fin } },
        ],
      },
      // Pas de dateDebut mais deadline après début
      {
        AND: [
          { dateDebut: null },
          { deadline: { gte: debut } },
        ],
      },
    ],
  };

  if (statuts.length > 0) {
    whereEtapes.statut = { in: statuts };
  } else {
    // Par défaut exclure les validées sauf si explicitement demandé
    whereEtapes.statut = { in: ["A_FAIRE", "EN_COURS"] };
  }

  if (!includePassees) {
    // Exclure étapes validées avec deadline passée
    // (les non-validées en retard restent visibles)
  }

  if (projetIds.length > 0) {
    whereEtapes.projetId = { in: projetIds };
  }

  // Fetch data en parallèle
  const [activites, etapesRaw, allConsultants, allProjets] = await Promise.all([
    prisma.activite.findMany({
      where: whereActivites,
      include: {
        consultant: { select: { id: true, nom: true, couleur: true } },
        projet: { select: { id: true, nom: true, couleur: true } },
        etape: { select: { id: true, nom: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.etape.findMany({
      where: whereEtapes,
      include: {
        projet: { select: { id: true, nom: true, couleur: true } },
        activites: {
          include: {
            consultant: { select: { id: true, nom: true, couleur: true } },
          },
        },
      },
      orderBy: [{ projetId: "asc" }, { ordre: "asc" }],
    }),
    prisma.consultant.findMany({
      where: { actif: true },
      select: { id: true, nom: true, couleur: true, tjm: true },
      orderBy: { nom: "asc" },
    }),
    prisma.projet.findMany({
      where: { statut: { not: "TERMINE" } },
      select: { id: true, nom: true, couleur: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  // Build heuresParJour map
  const heuresParJour: Record<string, number> = {};
  for (const a of activites) {
    const dateKey = a.date.toISOString().split("T")[0];
    heuresParJour[dateKey] = (heuresParJour[dateKey] || 0) + Number(a.heures);
  }

  // Format activites
  const formattedActivites = activites.map((a) => ({
    id: a.id,
    date: a.date.toISOString().split("T")[0],
    heures: Number(a.heures),
    consultant: {
      ...a.consultant,
      couleur: getConsultantColor(a.consultant.id, a.consultant.couleur),
    },
    projet: a.projet,
    etape: a.etape,
    description: a.description,
    facturable: a.facturable,
  }));

  // Format etapes avec consultants (déduits des activités) + calculs santé
  const formattedEtapes = etapesRaw.map((e) => {
    // Consultants uniques via activités
    const consultantMap = new Map<number, { id: number; nom: string; couleur: string }>();
    let tempsPasseHeures = 0;
    for (const a of e.activites) {
      consultantMap.set(a.consultant.id, {
        id: a.consultant.id,
        nom: a.consultant.nom,
        couleur: getConsultantColor(a.consultant.id, a.consultant.couleur),
      });
      tempsPasseHeures += Number(a.heures);
    }
    const consultants = Array.from(consultantMap.values());
    const tempsPasseJours = tempsPasseHeures / HEURES_PAR_JOUR;

    // Calcul santé
    const chargeEstimeeJours = e.chargeEstimeeJours ?? 0;
    let health: "good" | "attention" | "critical" = "good";
    if (chargeEstimeeJours > 0) {
      const ratio = tempsPasseJours / chargeEstimeeJours;
      if (ratio > 1.2) health = "critical";
      else if (ratio > 1.0) health = "attention";
    }

    // Calcul urgence
    const deadlineDate = e.deadline ? new Date(e.deadline) : null;
    deadlineDate?.setHours(0, 0, 0, 0);
    let joursRestants = deadlineDate
      ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    let urgence: "retard" | "critique" | "proche" | "normal" = "normal";
    if (joursRestants !== null) {
      if (joursRestants < 0) urgence = "retard";
      else if (joursRestants <= 3) urgence = "critique";
      else if (joursRestants <= 7) urgence = "proche";
    }

    // Filtrer par urgence si demandé
    if (urgences.length > 0 && !urgences.includes(urgence)) {
      return null;
    }

    // Masquer deadlines passées validées si includePassees=false
    if (!includePassees && e.statut === "VALIDEE" && joursRestants !== null && joursRestants < 0) {
      return null;
    }

    // dateDebut effective : si pas de dateDebut, utiliser deadline - chargeEstimeeJours jours ouvrés
    let effectiveDateDebut = e.dateDebut;
    if (!effectiveDateDebut && e.deadline && e.chargeEstimeeJours) {
      // Approximation: debut = deadline - chargeEstimeeJours * 1.4 (pour jours ouvrés)
      const approxMs = e.chargeEstimeeJours * 1.4 * 24 * 60 * 60 * 1000;
      effectiveDateDebut = new Date(e.deadline.getTime() - approxMs);
    }

    return {
      id: e.id,
      nom: e.nom,
      description: e.description,
      statut: e.statut,
      dateDebut: effectiveDateDebut ? effectiveDateDebut.toISOString().split("T")[0] : null,
      deadline: e.deadline ? e.deadline.toISOString().split("T")[0] : null,
      chargeEstimeeJours: e.chargeEstimeeJours,
      ordre: e.ordre,
      projet: e.projet,
      consultants,
      tempsPasseJours,
      health,
      urgence,
      joursRestants,
    };
  }).filter(Boolean);

  // Calcul charge planifiée par consultant par jour (pour vue Charge Équipe)
  // Map: consultantId -> dateKey -> heures planifiées
  const chargePlanifiee: Record<number, Record<string, number>> = {};

  const periodDays = eachDayOfInterval({ start: debut, end: fin });

  for (const consultant of allConsultants) {
    chargePlanifiee[consultant.id] = {};
    const etapesConsultant = formattedEtapes.filter(
      (e) => e && e.consultants.some((c) => c.id === consultant.id)
    );

    for (const etape of etapesConsultant) {
      if (!etape || !etape.deadline) continue;
      const etapeDebut = etape.dateDebut ? parseISO(etape.dateDebut) : debut;
      const etapeFin = parseISO(etape.deadline);
      const joursOuvrables = getBusinessDays(etapeDebut, etapeFin);
      const heuresParJourEtape = ((etape.chargeEstimeeJours ?? 1) * 8) / joursOuvrables;

      for (const day of periodDays) {
        if (isWeekend(day)) continue;
        if (day >= etapeDebut && day <= etapeFin) {
          const key = day.toISOString().split("T")[0];
          chargePlanifiee[consultant.id][key] =
            (chargePlanifiee[consultant.id][key] || 0) + heuresParJourEtape;
        }
      }
    }
  }

  // Stats globales
  const enRetard = formattedEtapes.filter((e) => e?.urgence === "retard").length;
  const critiques = formattedEtapes.filter((e) => e?.urgence === "critique").length;

  // Consultants surchargés (> 8h un jour)
  let surcharges = 0;
  let capaciteDisponible = 0;
  for (const [, jourMap] of Object.entries(chargePlanifiee)) {
    for (const [, heures] of Object.entries(jourMap)) {
      if (heures > HEURES_PAR_JOUR) surcharges++;
      if (heures < 6) capaciteDisponible += (HEURES_PAR_JOUR - heures) / HEURES_PAR_JOUR; // en jours
    }
  }

  // Anciens deadlines (compatibilité)
  const deadlines = formattedEtapes
    .filter((e) => e?.deadline)
    .map((e) => ({
      id: e!.id,
      date: e!.deadline,
      etape: { nom: e!.nom, statut: e!.statut },
      projet: e!.projet,
      joursRestants: e!.joursRestants,
    }));

  return NextResponse.json({
    activites: formattedActivites,
    deadlines,
    heuresParJour,
    etapes: formattedEtapes,
    consultants: allConsultants.map((c) => ({
      ...c,
      couleur: getConsultantColor(c.id, c.couleur),
      tjm: c.tjm ? Number(c.tjm) : null,
    })),
    projets: allProjets,
    chargePlanifiee,
    stats: {
      totalEtapes: formattedEtapes.length,
      enRetard,
      critiques,
      surcharges,
      capaciteDisponible: Math.round(capaciteDisponible),
    },
  });
}
