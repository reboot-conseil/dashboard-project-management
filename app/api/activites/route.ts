import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const activiteSchema = z.object({
  consultantId: z.number().int(),
  projetId: z.number().int(),
  etapeId: z.number().int().nullable().optional(),
  date: z.string().min(1, "La date est requise"),
  heures: z.number().min(0, "Minimum 0h").max(24, "Maximum 24h"),
  description: z.string().nullable().optional(),
  facturable: z.boolean(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const consultantId = searchParams.get("consultantId");
  const projetId = searchParams.get("projetId");
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");
  const facturable = searchParams.get("facturable");

  const where: Prisma.ActiviteWhereInput = {};

  if (consultantId) where.consultantId = parseInt(consultantId);
  if (projetId) where.projetId = parseInt(projetId);
  if (facturable === "true") where.facturable = true;
  if (facturable === "false") where.facturable = false;

  if (dateDebut || dateFin) {
    where.date = {};
    if (dateDebut) where.date.gte = new Date(dateDebut);
    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      where.date.lte = fin;
    }
  }

  const [activites, totaux] = await Promise.all([
    prisma.activite.findMany({
      where,
      include: {
        consultant: { select: { id: true, nom: true, couleur: true } },
        projet: { select: { id: true, nom: true, couleur: true } },
        etape: { select: { id: true, nom: true } },
      },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.activite.aggregate({
      where,
      _sum: { heures: true },
    }),
  ]);

  const totalFacturable = await prisma.activite.aggregate({
    where: { ...where, facturable: true },
    _sum: { heures: true },
  });

  const totalNonFacturable = await prisma.activite.aggregate({
    where: { ...where, facturable: false },
    _sum: { heures: true },
  });

  return NextResponse.json({
    activites,
    totaux: {
      total: Number(totaux._sum.heures ?? 0),
      facturable: Number(totalFacturable._sum.heures ?? 0),
      nonFacturable: Number(totalNonFacturable._sum.heures ?? 0),
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = activiteSchema.parse(body);

    const activite = await prisma.activite.create({
      data: {
        consultantId: data.consultantId,
        projetId: data.projetId,
        etapeId: data.etapeId ?? null,
        date: new Date(data.date),
        heures: data.heures,
        description: data.description ?? null,
        facturable: data.facturable,
      },
      include: {
        consultant: { select: { id: true, nom: true, couleur: true } },
        projet: { select: { id: true, nom: true, couleur: true } },
        etape: { select: { id: true, nom: true } },
      },
    });
    return NextResponse.json(activite, { status: 201 });
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
