import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { differenceInDays } from "date-fns";

export type AlerteSeverite = "critique" | "attention" | "info";
export type AlerteType = "budget_depasse" | "budget_eleve" | "deadline_depassee" | "deadline_proche" | "marge_negative";

export interface Alerte {
  id: string;
  type: AlerteType;
  severite: AlerteSeverite;
  titre: string;
  description: string;
  projetId: number;
  projetNom: string;
  valeur?: number;
}

export async function GET() {
  const now = new Date();

  const projets = await prisma.projet.findMany({
    where: { statut: { in: ["EN_COURS", "PLANIFIE"] } },
    include: {
      etapes: {
        where: { statut: { not: "VALIDEE" }, deadline: { not: null } },
        select: { id: true, nom: true, deadline: true, statut: true },
      },
      activites: {
        select: {
          heures: true,
          facturable: true,
          consultant: { select: { tjm: true, coutJournalierEmployeur: true } },
        },
      },
    },
  });

  const alertes: Alerte[] = [];

  for (const p of projets) {
    const budget = Number(p.budget ?? 0);
    const ca = p.activites.reduce(
      (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0),
      0
    );
    const coutReel = p.activites.reduce(
      (sum, a) => sum + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0),
      0
    );
    const marge = ca - coutReel;
    const pctBudget = budget > 0 ? Math.round((ca / budget) * 100) : 0;

    // Budget > 100%
    if (budget > 0 && pctBudget > 100) {
      alertes.push({
        id: `budget-depasse-${p.id}`,
        type: "budget_depasse",
        severite: "critique",
        titre: "Budget dépassé",
        description: `${p.nom} — ${pctBudget}% du budget consommé (dépassement de ${Math.round(ca - budget).toLocaleString("fr-FR")} \u20AC)`,
        projetId: p.id,
        projetNom: p.nom,
        valeur: pctBudget,
      });
    }
    // Budget > 80%
    else if (budget > 0 && pctBudget >= 80) {
      alertes.push({
        id: `budget-eleve-${p.id}`,
        type: "budget_eleve",
        severite: "attention",
        titre: "Budget presque atteint",
        description: `${p.nom} — ${pctBudget}% du budget consommé`,
        projetId: p.id,
        projetNom: p.nom,
        valeur: pctBudget,
      });
    }

    // Marge négative
    if (ca > 0 && marge < 0) {
      alertes.push({
        id: `marge-neg-${p.id}`,
        type: "marge_negative",
        severite: "critique",
        titre: "Marge négative",
        description: `${p.nom} — marge de ${Math.round(marge).toLocaleString("fr-FR")} \u20AC (coût > CA)`,
        projetId: p.id,
        projetNom: p.nom,
        valeur: Math.round(marge),
      });
    }

    // Deadlines
    for (const e of p.etapes) {
      if (!e.deadline) continue;
      const jours = differenceInDays(new Date(e.deadline), now);

      if (jours < 0) {
        alertes.push({
          id: `deadline-depassee-${e.id}`,
          type: "deadline_depassee",
          severite: "critique",
          titre: "Deadline dépassée",
          description: `${p.nom} — étape "${e.nom}" en retard de ${Math.abs(jours)} jour${Math.abs(jours) > 1 ? "s" : ""}`,
          projetId: p.id,
          projetNom: p.nom,
          valeur: jours,
        });
      } else if (jours <= 7) {
        alertes.push({
          id: `deadline-proche-${e.id}`,
          type: "deadline_proche",
          severite: "attention",
          titre: "Deadline imminente",
          description: `${p.nom} — étape "${e.nom}" dans ${jours} jour${jours > 1 ? "s" : ""}`,
          projetId: p.id,
          projetNom: p.nom,
          valeur: jours,
        });
      }
    }
  }

  // Sort by severity: critique first, then attention, then info
  const severityOrder: Record<AlerteSeverite, number> = { critique: 0, attention: 1, info: 2 };
  alertes.sort((a, b) => severityOrder[a.severite] - severityOrder[b.severite]);

  return NextResponse.json(alertes);
}
