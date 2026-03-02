import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  tjm: z.number().min(0, "Le TJM doit être positif"),
  coutJournalierEmployeur: z.number().min(0).nullable().optional(),
  competences: z.string().optional().default(""),
  couleur: z.string().optional(),
  actif: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const consultant = await prisma.consultant.findUnique({
    where: { id: parseInt(id) },
  });
  if (!consultant) {
    return NextResponse.json({ error: "Consultant non trouvé" }, { status: 404 });
  }
  return NextResponse.json(consultant);
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.consultant.findFirst({
      where: { email: data.email, id: { not: parseInt(id) } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Un consultant avec cet email existe déjà" },
        { status: 409 }
      );
    }

    const consultant = await prisma.consultant.update({
      where: { id: parseInt(id) },
      data,
    });
    return NextResponse.json(consultant);
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

    const consultant = await prisma.consultant.update({
      where: { id: parseInt(id) },
      data: { actif: body.actif },
    });
    return NextResponse.json(consultant);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
