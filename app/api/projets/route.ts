import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInDays } from "date-fns";
import { calculerProgression } from "@/lib/projet-metrics";
import { requireAuth } from "@/lib/auth-guard";

const projetSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  client: z.string().min(1, "Le client est requis"),
  budget: z.number().min(0, "Le budget doit être positif"),
  chargeEstimeeTotale: z.number().nullable().optional(),
  dateDebut: z.string().min(1, "La date de début est requise"),
  dateFin: z.string().nullable().optional(),
  statut: z.enum(["PLANIFIE", "EN_COURS", "EN_PAUSE", "TERMINE"]),
});

export async function GET(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const statut = searchParams.get("statut");

    const where = statut && statut !== "TOUS"
      ? { statut: statut as "PLANIFIE" | "EN_COURS" | "EN_PAUSE" | "TERMINE" }
      : {};

    const projets = await prisma.projet.findMany({
      where,
      include: {
        etapes: { select: { id: true, nom: true, statut: true, deadline: true, chargeEstimeeJours: true } },
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
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const result = projets.map((p) => {
      const etapesValidees = p.etapes.filter((e) => e.statut === "VALIDEE").length;
      const budgetConsomme = p.activites.reduce(
        (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0),
        0
      );
      const coutReel = p.activites.reduce(
        (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0),
        0
      );
      const budget = Number(p.budget ?? 0);
      const marge = budgetConsomme - coutReel;
      const pctBudget = budget > 0 ? Math.round((budgetConsomme / budget) * 100) : 0;

      // Compute alerts for this project
      const alertes: string[] = [];
      if (budget > 0 && pctBudget > 100) alertes.push("budget_depasse");
      else if (budget > 0 && pctBudget >= 80) alertes.push("budget_eleve");
      if (budgetConsomme > 0 && marge < 0) alertes.push("marge_negative");
      for (const e of p.etapes) {
        if (!e.deadline || e.statut === "VALIDEE") continue;
        const jours = differenceInDays(new Date(e.deadline), now);
        if (jours < 0) alertes.push("deadline_depassee");
        else if (jours <= 7) alertes.push("deadline_proche");
      }

      // Prochaine deadline non validée
      const prochaineDeadline = p.etapes
        .filter((e) => e.statut !== "VALIDEE" && e.deadline)
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

      // Calcul progression (with defensive try-catch)
      let progression: {
        budgetConsommePct: number;
        realisationPct: number;
        ecart: number;
        health: "bon" | "normal" | "critique";
        healthLabel: string;
        dateFinEstimee: string | null;
      } = {
        budgetConsommePct: 0,
        realisationPct: 0,
        ecart: 0,
        health: "normal",
        healthLabel: "N/A",
        dateFinEstimee: null,
      };
      try {
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
        progression = {
          budgetConsommePct: prog.budgetConsommePct,
          realisationPct: prog.realisationPct,
          ecart: prog.ecart,
          health: prog.health,
          healthLabel: prog.healthLabel,
          dateFinEstimee: prog.dateFinEstimee,
        };
      } catch {
        // Keep default values on error
      }

      return {
        id: p.id,
        nom: p.nom,
        client: p.client,
        budget: p.budget,
        dateDebut: p.dateDebut,
        dateFin: p.dateFin,
        statut: p.statut,
        createdAt: p.createdAt,
        etapesTotal: p.etapes.length,
        etapesValidees,
        budgetConsomme,
        coutReel,
        marge,
        pctBudget,
        prochaineDeadline: prochaineDeadline?.deadline ?? null,
        alertes,
        // Progression metrics
        progressionBudgetPct: progression.budgetConsommePct,
        progressionRealisationPct: progression.realisationPct,
        progressionEcart: progression.ecart,
        progressionHealth: progression.health,
        progressionHealthLabel: progression.healthLabel,
        progressionDateFinEstimee: progression.dateFinEstimee,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projets error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    const body = await request.json();
    const data = projetSchema.parse(body);

    const projet = await prisma.projet.create({
      data: {
        nom: data.nom,
        client: data.client,
        budget: data.budget,
        chargeEstimeeTotale: data.chargeEstimeeTotale ?? null,
        dateDebut: new Date(data.dateDebut),
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        statut: data.statut,
      },
    });
    return NextResponse.json(projet, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
