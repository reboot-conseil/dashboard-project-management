import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return "\uFEFF" + lines.join("\n"); // BOM for Excel FR
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "activites";
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");

  const dateFilter: Record<string, unknown> = {};
  if (dateDebut || dateFin) {
    dateFilter.date = {};
    if (dateDebut) (dateFilter.date as Record<string, unknown>).gte = new Date(dateDebut);
    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      (dateFilter.date as Record<string, unknown>).lte = fin;
    }
  }

  if (type === "activites") {
    const activites = await prisma.activite.findMany({
      where: dateFilter,
      include: {
        consultant: { select: { nom: true, email: true, tjm: true, coutJournalierEmployeur: true } },
        projet: { select: { nom: true, client: true } },
      },
      orderBy: { date: "desc" },
    });

    const csv = buildCsv(
      ["Date", "Consultant", "Email", "TJM", "Projet", "Client", "Heures", "Description", "Facturable", "Montant"],
      activites.map((a) => [
        new Date(a.date).toISOString().split("T")[0],
        a.consultant.nom,
        a.consultant.email,
        Number(a.consultant.tjm ?? 0),
        a.projet.nom,
        a.projet.client,
        Number(a.heures),
        a.description,
        a.facturable ? "Oui" : "Non",
        a.facturable ? (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0) : 0,
      ])
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="activites-${dateDebut || "all"}.csv"`,
      },
    });
  }

  if (type === "consultants") {
    const activites = await prisma.activite.findMany({
      where: dateFilter,
      include: {
        consultant: { select: { id: true, nom: true, email: true, tjm: true, coutJournalierEmployeur: true } },
      },
    });

    const map = new Map<number, { nom: string; email: string; tjm: number; heuresTotal: number; heuresFact: number; ca: number; coutReel: number }>();
    for (const a of activites) {
      const c = a.consultant;
      if (!map.has(c.id)) map.set(c.id, { nom: c.nom, email: c.email, tjm: Number(c.tjm ?? 0), heuresTotal: 0, heuresFact: 0, ca: 0, coutReel: 0 });
      const e = map.get(c.id)!;
      const h = Number(a.heures);
      e.heuresTotal += h;
      e.coutReel += (h / 8) * Number(c.coutJournalierEmployeur ?? 0);
      if (a.facturable) {
        e.heuresFact += h;
        e.ca += (h / 8) * Number(c.tjm ?? 0);
      }
    }

    const csv = buildCsv(
      ["Consultant", "Email", "TJM", "Heures totales", "Heures facturables", "CA généré", "Coût réel", "Marge", "Taux marge (%)"],
      Array.from(map.values()).map((c) => {
        const marge = c.ca - c.coutReel;
        const tauxMarge = c.ca > 0 ? Math.round((marge / c.ca) * 1000) / 10 : 0;
        return [c.nom, c.email, c.tjm, c.heuresTotal, c.heuresFact, c.ca, c.coutReel, marge, tauxMarge];
      })
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="consultants-${dateDebut || "all"}.csv"`,
      },
    });
  }

  if (type === "projets") {
    const projets = await prisma.projet.findMany({
      include: {
        activites: {
          where: dateFilter,
          include: { consultant: { select: { tjm: true, coutJournalierEmployeur: true } } },
        },
      },
    });

    const csv = buildCsv(
      ["Projet", "Client", "Statut", "Budget", "Heures", "CA", "Coût réel", "Marge", "% Marge", "% Budget utilisé"],
      projets
        .map((p) => {
          const heures = p.activites.reduce((s, a) => s + Number(a.heures), 0);
          const ca = p.activites.reduce((s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.tjm ?? 0), 0);
          const coutReel = p.activites.reduce((s, a) => s + (Number(a.heures) / 8) * Number(a.consultant.coutJournalierEmployeur ?? 0), 0);
          const marge = ca - coutReel;
          const budget = Number(p.budget ?? 0);
          return [p.nom, p.client, p.statut, budget, heures, ca, coutReel, marge, ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0, budget > 0 ? Math.round((ca / budget) * 100) : 0];
        })
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="projets-${dateDebut || "all"}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Type invalide" }, { status: 400 });
}
