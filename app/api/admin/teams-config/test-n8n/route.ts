import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";

export async function POST() {
  const authError = await requireRole(["ADMIN"]);
  if (authError) return authError;
  try {
    const config = await prisma.integrationConfig.findFirst();

    if (!config) {
      return NextResponse.json(
        { error: "Configuration non trouvée" },
        { status: 404 }
      );
    }

    const testUrl = `${config.n8nUrl}/webhook/teams-dashboard-test`;

    let response: Response;
    try {
      response = await fetch(testUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.webhookSecret}`,
        },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(8000), // 8s timeout
      });
    } catch (fetchError: unknown) {
      const msg =
        fetchError instanceof Error ? fetchError.message : "Erreur réseau";
      return NextResponse.json({
        success: false,
        message: "Impossible de contacter N8N",
        error: msg,
      });
    }

    if (response.ok) {
      await prisma.integrationConfig.update({
        where: { id: config.id },
        data: { derniereSync: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "Connexion N8N réussie",
        timestamp: new Date(),
      });
    }

    return NextResponse.json({
      success: false,
      message: `Erreur N8N: ${response.status} ${response.statusText}`,
      error: await response.text(),
    });
  } catch (error) {
    console.error("Erreur test N8N:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
