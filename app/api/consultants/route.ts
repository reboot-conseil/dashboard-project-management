import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Palette auto-assignée à la création
const CONSULTANT_COLORS = [
  "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316", "#6366F1", "#84CC16",
];

const consultantSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  tjm: z.number().min(0, "Le TJM doit être positif"),
  coutJournalierEmployeur: z.number().min(0).nullable().optional(),
  competences: z.string().optional().default(""),
  couleur: z.string().optional(),
  actif: z.boolean().optional().default(true),
});

export async function GET() {
  const consultants = await prisma.consultant.findMany({
    orderBy: { nom: "asc" },
  });
  return NextResponse.json(consultants);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = consultantSchema.parse(body);

    const existing = await prisma.consultant.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Un consultant avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // Auto-assigner une couleur si non fournie
    const existingCount = await prisma.consultant.count();
    const couleur = data.couleur || CONSULTANT_COLORS[existingCount % CONSULTANT_COLORS.length];

    const consultant = await prisma.consultant.create({
      data: { ...data, couleur },
    });
    return NextResponse.json(consultant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
