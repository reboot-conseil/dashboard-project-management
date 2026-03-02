import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Récupérer config globale + toutes les configs projet
export async function GET() {
  try {
    let globalConfig = await prisma.integrationConfig.findFirst();

    if (!globalConfig) {
      globalConfig = await prisma.integrationConfig.create({
        data: {
          n8nUrl: "https://n8n.spoton-ai.fr",
          webhookSecret: process.env.N8N_WEBHOOK_SECRET ?? "",
          emailDomain: "@reboot-conseil.com",
        },
      });
    }

    const projetsConfigs = await prisma.projetTeamsConfig.findMany({
      include: {
        projet: {
          select: { id: true, nom: true, client: true, statut: true },
        },
      },
      orderBy: { projet: { nom: "asc" } },
    });

    const projetsSansConfig = await prisma.projet.findMany({
      where: {
        teamsConfig: null,
        statut: { in: ["EN_COURS", "PLANIFIE"] },
      },
      select: { id: true, nom: true, client: true, statut: true },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json({ globalConfig, projetsConfigs, projetsSansConfig });
  } catch (error) {
    console.error("Erreur GET teams-config:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Créer ou mettre à jour config d'un projet (upsert)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projetId, canalNom, canalId, webhookUrl, logAutoActif } = body;

    if (!projetId) {
      return NextResponse.json({ error: "projetId requis" }, { status: 400 });
    }

    const projet = await prisma.projet.findUnique({ where: { id: projetId } });
    if (!projet) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    const config = await prisma.projetTeamsConfig.upsert({
      where: { projetId },
      create: {
        projetId,
        canalNom: canalNom || null,
        canalId: canalId || null,
        webhookUrl: webhookUrl || null,
        logAutoActif: logAutoActif ?? true,
      },
      update: {
        canalNom: canalNom || null,
        canalId: canalId || null,
        webhookUrl: webhookUrl || null,
        logAutoActif: logAutoActif ?? true,
      },
      include: {
        projet: { select: { nom: true, client: true } },
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Erreur POST teams-config:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT - Modifier config globale
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { n8nUrl, webhookSecret, emailDomain, actif } = body;

    const existing = await prisma.integrationConfig.findFirst();

    let config;
    if (existing) {
      config = await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: {
          ...(n8nUrl !== undefined && { n8nUrl }),
          ...(webhookSecret !== undefined && { webhookSecret }),
          ...(emailDomain !== undefined && { emailDomain }),
          ...(actif !== undefined && { actif }),
          updatedAt: new Date(),
        },
      });
    } else {
      config = await prisma.integrationConfig.create({
        data: {
          n8nUrl: n8nUrl ?? "https://n8n.spoton-ai.fr",
          webhookSecret: webhookSecret ?? "",
          emailDomain: emailDomain ?? "@reboot-conseil.com",
          actif: actif ?? true,
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Erreur PUT teams-config:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
