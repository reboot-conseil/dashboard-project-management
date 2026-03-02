import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function calculateScore(
  projet: { nom: string; client: string; statut: string },
  query: string
): number {
  const queryLower = query.toLowerCase().trim();
  const nomLower = projet.nom.toLowerCase();
  const clientLower = projet.client.toLowerCase();

  let score = 0;

  if (nomLower === queryLower) score += 100;
  else if (nomLower.startsWith(queryLower)) score += 80;
  else if (nomLower.includes(queryLower)) score += 60;

  if (clientLower === queryLower) score += 50;
  else if (clientLower.startsWith(queryLower)) score += 40;
  else if (clientLower.includes(queryLower)) score += 30;

  if (projet.statut === "EN_COURS") score += 10;

  return score;
}

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        projets: [],
        message: "Requête trop courte (min 2 caractères)",
      });
    }

    const projets = await prisma.projet.findMany({
      where: {
        statut: { in: ["EN_COURS", "PLANIFIE"] },
      },
      include: {
        etapes: {
          select: { id: true, nom: true, statut: true },
        },
      },
    });

    const projetsAvecScore = projets
      .map((p) => ({ ...p, score: calculateScore(p, query) }))
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({
      projets: projetsAvecScore,
      count: projetsAvecScore.length,
    });
  } catch (error) {
    console.error("Erreur search projets:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
