import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculerProgression } from "@/lib/projet-metrics";
import { requireAuth } from "@/lib/auth-guard";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { id } = await params;
  const projetId = parseInt(id);

  const projet = await prisma.projet.findUnique({
    where: { id: projetId },
    include: {
      etapes: {
        orderBy: { ordre: "asc" },
        select: {
          id: true,
          nom: true,
          statut: true,
          chargeEstimeeJours: true,
        },
      },
      activites: {
        select: {
          heures: true,
          date: true,
          etapeId: true,
        },
      },
    },
  });

  if (!projet) {
    return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
  }

  const metrics = calculerProgression(
    {
      dateDebut: projet.dateDebut?.toISOString() ?? null,
      dateFin: projet.dateFin?.toISOString() ?? null,
      chargeEstimeeTotale: projet.chargeEstimeeTotale,
    },
    projet.etapes.map((e) => ({
      id: e.id,
      nom: e.nom,
      statut: e.statut as "A_FAIRE" | "EN_COURS" | "VALIDEE",
      chargeEstimeeJours: e.chargeEstimeeJours,
    })),
    projet.activites.map((a) => ({
      heures: Number(a.heures),
      date: a.date.toISOString(),
      etapeId: a.etapeId,
    }))
  );

  return NextResponse.json(metrics);
}
