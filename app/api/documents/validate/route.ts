import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, action, validatedData } = body;

    if (!documentId || !action) {
      return NextResponse.json(
        { error: "documentId et action requis" },
        { status: 400 }
      );
    }

    const doc = await prisma.documentIngestion.findUnique({
      where: { id: parseInt(documentId) },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    // ── REJET ──────────────────────────────────────────────────
    if (action === "reject") {
      await prisma.documentIngestion.update({
        where: { id: doc.id },
        data: { status: "REJECTED", processedAt: new Date() },
      });
      console.log(`[DOC VALIDATE] Document ${doc.id} rejeté`);
      return NextResponse.json({ success: true, action: "rejected" });
    }

    // ── VALIDATION ─────────────────────────────────────────────
    if (action !== "validate") {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    if (!validatedData) {
      return NextResponse.json({ error: "validatedData requis" }, { status: 400 });
    }

    const {
      createNewProject,
      projetId: existingProjetId,
      projet: projetData,
      etapes: etapesData,
      activites: activitesData,
    } = validatedData;

    // Transaction atomique
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer ou récupérer le projet
      let projetId: number;

      if (createNewProject && projetData) {
        const newProjet = await tx.projet.create({
          data: {
            nom: projetData.nom || "Projet sans nom",
            client: projetData.client || "Client inconnu",
            dateDebut: projetData.dateDebut ? new Date(projetData.dateDebut) : null,
            dateFin: projetData.dateFin ? new Date(projetData.dateFin) : null,
            budget: projetData.budget ?? null,
            statut: projetData.statut === "EN_COURS" ? "EN_COURS" : "PLANIFIE",
          },
        });
        projetId = newProjet.id;
        console.log(`[DOC VALIDATE] Nouveau projet créé: ${newProjet.id} — ${newProjet.nom}`);
      } else if (existingProjetId) {
        projetId = parseInt(existingProjetId);
        const exists = await tx.projet.findUnique({ where: { id: projetId } });
        if (!exists) {
          throw new Error(`Projet ${projetId} introuvable`);
        }
      } else {
        throw new Error("Aucun projet cible spécifié");
      }

      // 2. Créer les étapes
      let etapesCreated = 0;
      const etapeMap = new Map<string, number>(); // nom → id pour matcher activités

      if (Array.isArray(etapesData)) {
        for (const etape of etapesData) {
          if (!etape.nom) continue;
          const created = await tx.etape.create({
            data: {
              projetId,
              nom: etape.nom,
              description: etape.description ?? null,
              chargeEstimeeJours: etape.chargeEstimeeJours ?? null,
              dateDebut: etape.dateDebut ? new Date(etape.dateDebut) : null,
              deadline: etape.dateFin ? new Date(etape.dateFin) : null,
              ordre: etape.ordre ?? etapesCreated + 1,
              statut: "A_FAIRE",
            },
          });
          etapeMap.set(etape.nom.toLowerCase(), created.id);
          etapesCreated++;
        }
        console.log(`[DOC VALIDATE] ${etapesCreated} étapes créées`);
      }

      // 3. Créer les activités (si présentes)
      let activitesCreated = 0;

      if (Array.isArray(activitesData)) {
        for (const act of activitesData) {
          if (!act.date || !act.heures) continue;

          // Matcher consultant par email ou créer le profil
          let consultantId: number | null = null;
          const CONSULTANT_COLORS = ["#8B5CF6","#EC4899","#F59E0B","#10B981","#06B6D4","#F97316"];

          if (act.consultantEmail) {
            const consultant = await tx.consultant.findUnique({
              where: { email: act.consultantEmail },
              select: { id: true },
            });
            if (consultant) {
              consultantId = consultant.id;
            } else {
              // Créer le profil consultant avec email connu
              const count = await tx.consultant.count();
              const created = await tx.consultant.create({
                data: {
                  email: act.consultantEmail,
                  nom: act.consultantNom ?? act.consultantEmail.split("@")[0],
                  role: "CONSULTANT",
                  actif: true,
                  couleur: CONSULTANT_COLORS[count % CONSULTANT_COLORS.length],
                },
              });
              consultantId = created.id;
              console.log(`[DOC VALIDATE] Nouveau consultant créé (email): ${created.nom}`);
            }
          } else if (act.consultantNom) {
            // Chercher par nom exact d'abord
            const byName = await tx.consultant.findFirst({
              where: { nom: { equals: act.consultantNom, mode: "insensitive" } },
              select: { id: true },
            });
            if (byName) {
              consultantId = byName.id;
            } else {
              // Créer avec email placeholder — admin liera l'email plus tard
              const count = await tx.consultant.count();
              const placeholder = `_sans-email-${Date.now()}@noemail.local`;
              const created = await tx.consultant.create({
                data: {
                  email: placeholder,
                  nom: act.consultantNom,
                  role: "CONSULTANT",
                  actif: true,
                  couleur: CONSULTANT_COLORS[count % CONSULTANT_COLORS.length],
                },
              });
              consultantId = created.id;
              console.log(`[DOC VALIDATE] Nouveau consultant créé (nom seul): ${created.nom}`);
            }
          }

          // Skip si ni email ni nom disponible
          if (!consultantId) {
            console.warn(`[DOC VALIDATE] Activité skip — aucun consultant identifiable`);
            continue;
          }

          // Matcher étape par nom
          let etapeId: number | null = null;
          if (act.etapeNom) {
            etapeId = etapeMap.get(act.etapeNom.toLowerCase()) ?? null;
          }

          await tx.activite.create({
            data: {
              consultantId,
              projetId,
              etapeId,
              date: new Date(act.date),
              heures: parseFloat(act.heures),
              description: act.description ?? "",
              facturable: true,
            },
          });
          activitesCreated++;
        }
        console.log(`[DOC VALIDATE] ${activitesCreated} activités créées`);
      }

      // 4. Mettre à jour le document
      await tx.documentIngestion.update({
        where: { id: doc.id },
        data: {
          status: "PROCESSED",
          projetId,
          processedAt: new Date(),
          validatedData: validatedData as any,
        },
      });

      return { projetId, etapesCreated, activitesCreated };
    });

    console.log(`[DOC VALIDATE] ✅ Document ${doc.id} traité avec succès`);

    return NextResponse.json({
      success: true,
      projetId: result.projetId,
      etapesCreated: result.etapesCreated,
      activitesCreated: result.activitesCreated,
    });
  } catch (error: any) {
    console.error("[DOC VALIDATE] Erreur:", error.message, error.stack);
    return NextResponse.json(
      {
        error: "Erreur lors de la validation",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
