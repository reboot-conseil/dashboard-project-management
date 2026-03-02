import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  description: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  chargeEstimeeJours: z.number().nullable().optional(),
  ordre: z.number().int(),
  statut: z.enum(["A_FAIRE", "EN_COURS", "VALIDEE"]),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const etape = await prisma.etape.update({
      where: { id: parseInt(id) },
      data: {
        nom: data.nom,
        description: data.description ?? null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        chargeEstimeeJours: data.chargeEstimeeJours ?? null,
        ordre: data.ordre,
        statut: data.statut,
      },
    });
    return NextResponse.json(etape);
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

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.statut !== undefined) updateData.statut = body.statut;
    if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.dateDebut !== undefined) updateData.dateDebut = body.dateDebut ? new Date(body.dateDebut) : null;
    if (body.nom !== undefined) updateData.nom = body.nom;

    const etape = await prisma.etape.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        projet: { select: { id: true, nom: true, couleur: true } },
        activites: {
          include: { consultant: { select: { id: true, nom: true, couleur: true } } },
        },
      },
    });
    return NextResponse.json(etape);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.etape.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
