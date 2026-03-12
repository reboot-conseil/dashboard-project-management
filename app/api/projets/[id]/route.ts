import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";

const updateSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  client: z.string().min(1, "Le client est requis"),
  budget: z.number().min(0, "Le budget doit être positif"),
  chargeEstimeeTotale: z.number().nullable().optional(),
  dateDebut: z.string().min(1, "La date de début est requise"),
  dateFin: z.string().nullable().optional(),
  statut: z.enum(["PLANIFIE", "EN_COURS", "EN_PAUSE", "TERMINE"]),
  couleur: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { id } = await params;
  const projet = await prisma.projet.findUnique({
    where: { id: parseInt(id) },
    include: {
      etapes: { orderBy: { ordre: "asc" } },
      activites: {
        include: {
          consultant: { select: { id: true, nom: true, couleur: true, tjm: true, coutJournalierEmployeur: true } },
          etape: { select: { id: true, nom: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!projet) {
    return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
  }

  const budgetConsomme = projet.activites.reduce(
    (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant?.tjm ?? 0),
    0
  );
  const coutReel = projet.activites.reduce(
    (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant?.coutJournalierEmployeur ?? 0),
    0
  );
  const totalHeures = projet.activites.reduce(
    (sum, a) => sum + Number(a.heures),
    0
  );
  const marge = budgetConsomme - coutReel;

  return NextResponse.json({ ...projet, budgetConsomme, coutReel, marge, totalHeures });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const projet = await prisma.projet.update({
      where: { id: parseInt(id) },
      data: {
        nom: data.nom,
        client: data.client,
        budget: data.budget,
        chargeEstimeeTotale: data.chargeEstimeeTotale ?? null,
        dateDebut: new Date(data.dateDebut),
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        statut: data.statut,
        ...(data.couleur ? { couleur: data.couleur } : {}),
      },
    });
    return NextResponse.json(projet);
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

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    const { id } = await params;
    const pid = parseInt(id);

    await prisma.activite.deleteMany({ where: { projetId: pid } });
    await prisma.etape.deleteMany({ where: { projetId: pid } });
    await prisma.projet.delete({ where: { id: pid } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
