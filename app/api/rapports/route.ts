import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculerProgression } from "@/lib/projet-metrics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");

  if (!dateDebut || !dateFin) {
    return NextResponse.json(
      { error: "dateDebut et dateFin sont requis" },
      { status: 400 }
    );
  }

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  fin.setHours(23, 59, 59, 999);

  // Période précédente (même durée)
  const dureeMs = fin.getTime() - debut.getTime();
  const prevFin = new Date(debut.getTime() - 1);
  const prevDebut = new Date(prevFin.getTime() - dureeMs);

  const dateFilter = { date: { gte: debut, lte: fin } };
  const prevDateFilter = { date: { gte: prevDebut, lte: prevFin } };

  // ── Requêtes parallèles ──────────────────────────────────────
  const [
    activites,
    totalAgg,
    totalFacturableAgg,
    prevTotalAgg,
    projets,
  ] = await Promise.all([
    // Toutes les activités de la période avec relations
    prisma.activite.findMany({
      where: dateFilter,
      include: {
        consultant: { select: { id: true, nom: true, email: true, tjm: true, coutJournalierEmployeur: true } },
        projet: { select: { id: true, nom: true, client: true, budget: true, statut: true } },
      },
      orderBy: { date: "asc" },
    }),
    // Totaux
    prisma.activite.aggregate({
      where: dateFilter,
      _sum: { heures: true },
    }),
    // Totaux facturables
    prisma.activite.aggregate({
      where: { ...dateFilter, facturable: true },
      _sum: { heures: true },
    }),
    // Totaux période précédente
    prisma.activite.aggregate({
      where: prevDateFilter,
      _sum: { heures: true },
    }),
    // Projets avec budget and progression data
    prisma.projet.findMany({
      include: {
        activites: {
          where: dateFilter,
          include: { consultant: { select: { tjm: true, coutJournalierEmployeur: true } } },
        },
        etapes: { select: { id: true, nom: true, statut: true, chargeEstimeeJours: true } },
      },
    }),
  ]);

  // ── Stats globales ───────────────────────────────────────────
  const totalHeures = Number(totalAgg._sum.heures ?? 0);
  const totalFacturable = Number(totalFacturableAgg._sum.heures ?? 0);
  const totalNonFacturable = totalHeures - totalFacturable;
  const prevTotal = Number(prevTotalAgg._sum.heures ?? 0);
  const variationPct = prevTotal > 0 ? Math.round(((totalHeures - prevTotal) / prevTotal) * 100) : null;

  // CA estimé
  const caTotal = activites
    .filter((a) => a.facturable)
    .reduce((sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);

  // Coût total (toutes activités, pas seulement facturables)
  const coutTotal = activites.reduce(
    (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0
  );
  const margeBrute = caTotal - coutTotal;
  const tauxMarge = caTotal > 0 ? Math.round((margeBrute / caTotal) * 1000) / 10 : 0;

  // Jours travaillés uniques
  const joursUniques = new Set(
    activites.map((a) => new Date(a.date).toISOString().split("T")[0])
  );
  const nbJours = joursUniques.size;
  const moyenneParJour = nbJours > 0 ? Math.round((totalHeures / nbJours) * 10) / 10 : 0;

  // ── Par consultant ───────────────────────────────────────────
  const consultantMap = new Map<
    number,
    {
      id: number;
      nom: string;
      email: string;
      tjm: number;
      coutJournalier: number;
      heuresTotal: number;
      heuresFacturables: number;
      heuresNonFacturables: number;
      ca: number;
      coutReel: number;
      jours: Set<string>;
    }
  >();

  for (const a of activites) {
    const c = a.consultant;
    if (!consultantMap.has(c.id)) {
      consultantMap.set(c.id, {
        id: c.id,
        nom: c.nom,
        email: c.email,
        tjm: Number(c.tjm ?? 0),
        coutJournalier: Number(c.coutJournalierEmployeur ?? 0),
        heuresTotal: 0,
        heuresFacturables: 0,
        heuresNonFacturables: 0,
        ca: 0,
        coutReel: 0,
        jours: new Set(),
      });
    }
    const entry = consultantMap.get(c.id)!;
    const h = Number(a.heures);
    entry.heuresTotal += h;
    entry.coutReel += (h / 8) * entry.coutJournalier;
    if (a.facturable) {
      entry.heuresFacturables += h;
      entry.ca += (h / 8) * Number(c.tjm ?? 0);
    } else {
      entry.heuresNonFacturables += h;
    }
    entry.jours.add(new Date(a.date).toISOString().split("T")[0]);
  }

  const parConsultant = Array.from(consultantMap.values())
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      email: c.email,
      tjm: c.tjm,
      heuresTotal: c.heuresTotal,
      heuresFacturables: c.heuresFacturables,
      heuresNonFacturables: c.heuresNonFacturables,
      tauxFacturable: c.heuresTotal > 0 ? Math.round((c.heuresFacturables / c.heuresTotal) * 100) : 0,
      ca: c.ca,
      coutReel: c.coutReel,
      marge: c.ca - c.coutReel,
      tauxMarge: c.ca > 0 ? Math.round(((c.ca - c.coutReel) / c.ca) * 1000) / 10 : 0,
      joursTravailles: c.jours.size,
    }))
    .sort((a, b) => b.ca - a.ca);

  // ── Par projet ───────────────────────────────────────────────
  // Fetch all activities (not filtered by period) for progression calc
  const allActivitesByProjet = await prisma.activite.findMany({
    where: { projetId: { in: projets.map((p) => p.id) } },
    select: { heures: true, date: true, etapeId: true, projetId: true },
  });

  const parProjet = projets
    .map((p) => {
      const heures = p.activites.reduce((s, a) => s + Number(a.heures), 0);
      const budgetConsomme = p.activites.reduce(
        (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0),
        0
      );
      const coutReelProjet = p.activites.reduce(
        (s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0),
        0
      );
      const margeProjet = budgetConsomme - coutReelProjet;
      const budget = Number(p.budget ?? 0);
      const pctBudget = budget > 0 ? Math.round((budgetConsomme / budget) * 100) : 0;
      const tauxMargeProjet = budgetConsomme > 0 ? Math.round((margeProjet / budgetConsomme) * 1000) / 10 : 0;

      // Progression calculation
      const projetActivites = allActivitesByProjet
        .filter((a) => a.projetId === p.id)
        .map((a) => ({ heures: Number(a.heures), date: a.date.toISOString(), etapeId: a.etapeId }));
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
        projetActivites
      );

      return {
        id: p.id,
        nom: p.nom,
        client: p.client,
        heures,
        budget,
        budgetConsomme,
        coutReel: coutReelProjet,
        marge: margeProjet,
        tauxMarge: tauxMargeProjet,
        pctBudget,
        statut: p.statut,
        etapesTotal: p.etapes.length,
        etapesValidees: p.etapes.filter((e) => e.statut === "VALIDEE").length,
        // Progression
        progressionBudgetPct: prog.budgetConsommePct,
        progressionRealisationPct: prog.realisationPct,
        progressionEcart: prog.ecart,
        progressionHealth: prog.health,
        progressionDateFinEstimee: prog.dateFinEstimee,
      };
    })
    .filter((p) => p.heures > 0)
    .sort((a, b) => b.pctBudget - a.pctBudget);

  // ── Données temporelles ──────────────────────────────────────
  const jourMap = new Map<string, { facturable: number; nonFacturable: number }>();
  for (const a of activites) {
    const key = new Date(a.date).toISOString().split("T")[0];
    if (!jourMap.has(key)) jourMap.set(key, { facturable: 0, nonFacturable: 0 });
    const entry = jourMap.get(key)!;
    if (a.facturable) {
      entry.facturable += Number(a.heures);
    } else {
      entry.nonFacturable += Number(a.heures);
    }
  }

  const parJour = Array.from(jourMap.entries())
    .map(([date, data]) => ({
      date,
      facturable: data.facturable,
      nonFacturable: data.nonFacturable,
      total: data.facturable + data.nonFacturable,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Stats temporelles
  const joursDeLaSemaine = [0, 0, 0, 0, 0, 0, 0]; // Lun-Dim
  const joursCount = [0, 0, 0, 0, 0, 0, 0];
  for (const entry of parJour) {
    const dow = (new Date(entry.date).getDay() + 6) % 7; // 0=Lun
    joursDeLaSemaine[dow] += entry.total;
    joursCount[dow]++;
  }
  const moyenneParJourSemaine = joursDeLaSemaine.map((h, i) =>
    joursCount[i] > 0 ? Math.round((h / joursCount[i]) * 10) / 10 : 0
  );

  const jourNoms = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const jourPlusActifIdx = moyenneParJourSemaine.indexOf(Math.max(...moyenneParJourSemaine));
  const jourMoinsActifIdx = moyenneParJourSemaine.indexOf(
    Math.min(...moyenneParJourSemaine.filter((h) => h > 0))
  );

  // Facturation par consultant par projet
  const facturationMap = new Map<number, { consultant: { id: number; nom: string; tjm: number }; projets: Map<number, { projetNom: string; heures: number; montant: number }> }>();
  for (const a of activites) {
    if (!a.facturable) continue;
    const cId = a.consultant.id;
    if (!facturationMap.has(cId)) {
      facturationMap.set(cId, {
        consultant: { id: cId, nom: a.consultant.nom, tjm: Number(a.consultant.tjm ?? 0) },
        projets: new Map(),
      });
    }
    const entry = facturationMap.get(cId)!;
    const pId = a.projet.id;
    if (!entry.projets.has(pId)) {
      entry.projets.set(pId, { projetNom: a.projet.nom, heures: 0, montant: 0 });
    }
    const pe = entry.projets.get(pId)!;
    pe.heures += Number(a.heures);
    pe.montant += (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0);
  }

  const facturation = Array.from(facturationMap.values()).map((f) => ({
    consultant: f.consultant,
    totalHeures: Array.from(f.projets.values()).reduce((s, p) => s + p.heures, 0),
    totalMontant: Array.from(f.projets.values()).reduce((s, p) => s + p.montant, 0),
    projets: Array.from(f.projets.values()),
  })).sort((a, b) => b.totalMontant - a.totalMontant);

  return NextResponse.json({
    stats: {
      totalHeures,
      totalFacturable,
      totalNonFacturable,
      variationPct,
      caTotal,
      coutTotal,
      margeBrute,
      tauxMarge,
      nbJours,
      moyenneParJour,
    },
    parConsultant,
    parProjet,
    temporel: {
      parJour,
      jourPlusActif: jourNoms[jourPlusActifIdx] ?? "—",
      jourPlusActifHeures: moyenneParJourSemaine[jourPlusActifIdx] ?? 0,
      jourMoinsActif: jourNoms[jourMoinsActifIdx] ?? "—",
      jourMoinsActifHeures: moyenneParJourSemaine[jourMoinsActifIdx] ?? 0,
    },
    facturation,
  });
}
