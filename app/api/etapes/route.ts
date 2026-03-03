import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";

const etapeSchema = z.object({
  projetId: z.number(),
  nom: z.string().min(1, "Le nom est requis"),
  description: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  chargeEstimeeJours: z.number().nullable().optional(),
  ordre: z.number().int(),
  statut: z.enum(["A_FAIRE", "EN_COURS", "VALIDEE"]),
});

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const projetIdParam = searchParams.get("projetId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    console.log('[API ETAPES] projetId:', projetIdParam, '| activeOnly:', activeOnly);

    if (!projetIdParam) {
      return NextResponse.json({ error: "Paramètre projetId requis" }, { status: 400 });
    }

    const projetId = parseInt(projetIdParam);

    if (isNaN(projetId)) {
      return NextResponse.json({ error: "projetId doit être un nombre" }, { status: 400 });
    }

    const projet = await prisma.projet.findUnique({
      where: { id: projetId },
    });

    if (!projet) {
      console.error('[API ETAPES] Projet introuvable:', projetId);
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    const etapes = await prisma.etape.findMany({
      where: {
        projetId,
        ...(activeOnly ? { statut: { in: ["A_FAIRE", "EN_COURS"] } } : {}),
      },
      orderBy: { ordre: "asc" },
      ...(activeOnly
        ? {
            select: {
              id: true,
              nom: true,
              statut: true,
              deadline: true,
              chargeEstimeeJours: true,
            },
          }
        : {}),
    });

    console.log('[API ETAPES] Étapes trouvées:', etapes.length);

    return NextResponse.json(
      activeOnly
        ? { etapes }
        : { success: true, projetId, projetNom: projet.nom, etapes }
    );
  } catch (error: any) {
    console.error('[API ETAPES] Erreur:', error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    const body = await request.json();
    const data = etapeSchema.parse(body);

    const etape = await prisma.etape.create({
      data: {
        projetId: data.projetId,
        nom: data.nom,
        description: data.description ?? null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        chargeEstimeeJours: data.chargeEstimeeJours ?? null,
        ordre: data.ordre,
        statut: data.statut,
      },
    });
    return NextResponse.json(etape, { status: 201 });
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
