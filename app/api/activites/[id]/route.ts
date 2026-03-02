import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  consultantId: z.number().int(),
  projetId: z.number().int(),
  etapeId: z.number().int().nullable().optional(),
  date: z.string().min(1, "La date est requise"),
  heures: z.number().min(0, "Minimum 0h").max(24, "Maximum 24h"),
  description: z.string().nullable().optional(),
  facturable: z.boolean(),
  // ownerId : ID du consultant qui initie la modification (vérification propriété)
  ownerId: z.number().int().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const activiteId = parseInt(id);
    const body = await request.json();
    const data = updateSchema.parse(body);

    // Vérification de propriété si ownerId fourni
    if (data.ownerId !== undefined) {
      const existing = await prisma.activite.findUnique({
        where: { id: activiteId },
        select: { consultantId: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
      }
      if (existing.consultantId !== data.ownerId) {
        console.warn(
          `[ACTIVITES] Tentative modification non autorisée — activite.consultantId=${existing.consultantId} ownerId=${data.ownerId}`
        );
        return NextResponse.json(
          { error: "Vous ne pouvez modifier que vos propres activités" },
          { status: 403 }
        );
      }
    }

    const activite = await prisma.activite.update({
      where: { id: activiteId },
      data: {
        consultantId: data.consultantId,
        projetId: data.projetId,
        etapeId: data.etapeId ?? null,
        date: new Date(data.date),
        heures: data.heures,
        description: data.description ?? null,
        facturable: data.facturable,
      },
    });
    return NextResponse.json(activite);
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const activiteId = parseInt(id);

    // Vérification de propriété via query param ?ownerId=X
    const { searchParams } = new URL(request.url);
    const ownerIdParam = searchParams.get("ownerId");

    if (ownerIdParam) {
      const ownerId = parseInt(ownerIdParam);
      const existing = await prisma.activite.findUnique({
        where: { id: activiteId },
        select: { consultantId: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
      }
      if (existing.consultantId !== ownerId) {
        console.warn(
          `[ACTIVITES] Tentative suppression non autorisée — activite.consultantId=${existing.consultantId} ownerId=${ownerId}`
        );
        return NextResponse.json(
          { error: "Vous ne pouvez supprimer que vos propres activités" },
          { status: 403 }
        );
      }
    }

    await prisma.activite.delete({ where: { id: activiteId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
