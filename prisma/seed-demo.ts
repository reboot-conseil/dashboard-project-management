/**
 * seed-demo.ts — Données de démonstration
 * Crée 3 projets avec étapes et activités (jan–mar 2026)
 * Ne supprime PAS les comptes avec password (admin/PM)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────
function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Jours ouvrés entre deux dates (lun-ven) */
function workingDays(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Sous-ensemble aléatoire déterministe (pas vraiment random — utilise modulo) */
function pickDays(days: Date[], rate: number): Date[] {
  return days.filter((_, i) => (i * 7 + 3) % 10 < rate * 10);
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("🧹 Nettoyage activités / étapes / projets existants...");
  await prisma.activite.deleteMany();
  await prisma.etape.deleteMany();
  await prisma.projet.deleteMany();

  // Supprime uniquement les consultants sans password (données de démo précédentes)
  await prisma.consultant.deleteMany({ where: { password: null } });

  // ── Consultants ──────────────────────────────────────────────
  console.log("👤 Création des consultants...");

  const sophie = await prisma.consultant.create({
    data: {
      nom: "Sophie Leroux",
      email: "sophie.leroux@reboot-conseil.com",
      tjm: 650,
      coutJournalierEmployeur: 380,
      competences: "UX/UI Design, Figma, React",
      couleur: "#8B5CF6",
      actif: true,
    },
  });

  const marc = await prisma.consultant.create({
    data: {
      nom: "Marc Dubois",
      email: "marc.dubois@reboot-conseil.com",
      tjm: 580,
      coutJournalierEmployeur: 340,
      competences: "Cloud, DevOps, AWS, Terraform",
      couleur: "#EC4899",
      actif: true,
    },
  });

  const julie = await prisma.consultant.create({
    data: {
      nom: "Julie Chen",
      email: "julie.chen@reboot-conseil.com",
      tjm: 720,
      coutJournalierEmployeur: 420,
      competences: "Data, Python, Power BI, SQL",
      couleur: "#F59E0B",
      actif: true,
    },
  });

  // ── Projet 1 : Eco Green — Refonte Site Web ──────────────────
  console.log("📁 Projet 1 : Eco Green...");
  const p1 = await prisma.projet.create({
    data: {
      nom: "Refonte Site Web",
      client: "Eco Green Solutions",
      budget: 45000,
      chargeEstimeeTotale: 65,
      dateDebut: d(2026, 1, 6),
      dateFin: d(2026, 3, 31),
      statut: "EN_COURS",
      couleur: "#3b82f6",
    },
  });

  const p1e1 = await prisma.etape.create({ data: { projetId: p1.id, nom: "Audit & Stratégie",        statut: "VALIDEE",  dateDebut: d(2026,1,6),  deadline: d(2026,1,24), chargeEstimeeJours: 10, ordre: 1 } });
  const p1e2 = await prisma.etape.create({ data: { projetId: p1.id, nom: "Design UX/UI",             statut: "VALIDEE",  dateDebut: d(2026,1,27), deadline: d(2026,2,14), chargeEstimeeJours: 18, ordre: 2 } });
  const p1e3 = await prisma.etape.create({ data: { projetId: p1.id, nom: "Développement Frontend",   statut: "EN_COURS", dateDebut: d(2026,2,17), deadline: d(2026,3,14), chargeEstimeeJours: 25, ordre: 3 } });
  await prisma.etape.create({               data: { projetId: p1.id, nom: "Tests & Déploiement",      statut: "A_FAIRE",  dateDebut: d(2026,3,17), deadline: d(2026,3,31), chargeEstimeeJours: 12, ordre: 4 } });

  // Activités P1
  const p1acts: Parameters<typeof prisma.activite.create>[0]["data"][] = [];

  // Étape 1 — Sophie + Marc (audit)
  for (const day of pickDays(workingDays(d(2026,1,6), d(2026,1,24)), 0.7)) {
    p1acts.push({ consultantId: sophie.id, projetId: p1.id, etapeId: p1e1.id, date: day, heures: 7, description: "Audit UX et analyse existant", facturable: true });
    p1acts.push({ consultantId: marc.id,   projetId: p1.id, etapeId: p1e1.id, date: day, heures: 6, description: "Analyse technique infrastructure", facturable: true });
  }
  // Étape 2 — Sophie (design)
  for (const day of pickDays(workingDays(d(2026,1,27), d(2026,2,14)), 0.8)) {
    p1acts.push({ consultantId: sophie.id, projetId: p1.id, etapeId: p1e2.id, date: day, heures: 8, description: "Maquettes Figma — Design system", facturable: true });
    if ((day.getDate() % 3) === 0) {
      p1acts.push({ consultantId: marc.id, projetId: p1.id, etapeId: p1e2.id, date: day, heures: 4, description: "Revue technique composants", facturable: true });
    }
  }
  // Étape 3 — Sophie + Marc (dev en cours jusqu'au 7 mars)
  for (const day of pickDays(workingDays(d(2026,2,17), d(2026,3,7)), 0.75)) {
    p1acts.push({ consultantId: sophie.id, projetId: p1.id, etapeId: p1e3.id, date: day, heures: 7, description: "Intégration React / Next.js", facturable: true });
    p1acts.push({ consultantId: marc.id,   projetId: p1.id, etapeId: p1e3.id, date: day, heures: 6, description: "API et déploiement CI/CD", facturable: true });
  }

  for (const act of p1acts) await prisma.activite.create({ data: act });
  console.log(`   ✓ ${p1acts.length} activités`);

  // ── Projet 2 : TechFlow — Migration Cloud ───────────────────
  console.log("📁 Projet 2 : TechFlow Industries...");
  const p2 = await prisma.projet.create({
    data: {
      nom: "Migration Cloud",
      client: "TechFlow Industries",
      budget: 38000,
      chargeEstimeeTotale: 55,
      dateDebut: d(2026, 1, 13),
      dateFin: d(2026, 3, 28),
      statut: "EN_COURS",
      couleur: "#6366f1",
    },
  });

  const p2e1 = await prisma.etape.create({ data: { projetId: p2.id, nom: "Analyse Infrastructure",   statut: "VALIDEE",  dateDebut: d(2026,1,13), deadline: d(2026,1,31), chargeEstimeeJours: 10, ordre: 1 } });
  const p2e2 = await prisma.etape.create({ data: { projetId: p2.id, nom: "Architecture Cloud",        statut: "VALIDEE",  dateDebut: d(2026,2,3),  deadline: d(2026,2,21), chargeEstimeeJours: 16, ordre: 2 } });
  const p2e3 = await prisma.etape.create({ data: { projetId: p2.id, nom: "Migration Données",         statut: "EN_COURS", dateDebut: d(2026,2,24), deadline: d(2026,3,14), chargeEstimeeJours: 20, ordre: 3 } });
  await prisma.etape.create({               data: { projetId: p2.id, nom: "Validation & Formation",   statut: "A_FAIRE",  dateDebut: d(2026,3,17), deadline: d(2026,3,28), chargeEstimeeJours: 9,  ordre: 4 } });

  const p2acts: Parameters<typeof prisma.activite.create>[0]["data"][] = [];

  for (const day of pickDays(workingDays(d(2026,1,13), d(2026,1,31)), 0.7)) {
    p2acts.push({ consultantId: marc.id,   projetId: p2.id, etapeId: p2e1.id, date: day, heures: 7, description: "Audit infrastructure on-premise", facturable: true });
    p2acts.push({ consultantId: julie.id,  projetId: p2.id, etapeId: p2e1.id, date: day, heures: 5, description: "Cartographie données & flux", facturable: true });
  }
  for (const day of pickDays(workingDays(d(2026,2,3), d(2026,2,21)), 0.8)) {
    p2acts.push({ consultantId: marc.id,   projetId: p2.id, etapeId: p2e2.id, date: day, heures: 8, description: "Architecture AWS — VPC, RDS, ECS", facturable: true });
    if ((day.getDate() % 2) === 0) {
      p2acts.push({ consultantId: julie.id, projetId: p2.id, etapeId: p2e2.id, date: day, heures: 6, description: "Modélisation données cloud", facturable: true });
    }
  }
  for (const day of pickDays(workingDays(d(2026,2,24), d(2026,3,7)), 0.75)) {
    p2acts.push({ consultantId: marc.id,   projetId: p2.id, etapeId: p2e3.id, date: day, heures: 8, description: "Scripts migration ETL", facturable: true });
    p2acts.push({ consultantId: julie.id,  projetId: p2.id, etapeId: p2e3.id, date: day, heures: 7, description: "Validation intégrité données", facturable: true });
  }

  for (const act of p2acts) await prisma.activite.create({ data: act });
  console.log(`   ✓ ${p2acts.length} activités`);

  // ── Projet 3 : Optima Group — Dashboard RH ──────────────────
  console.log("📁 Projet 3 : Optima Group...");
  const p3 = await prisma.projet.create({
    data: {
      nom: "Dashboard RH Analytics",
      client: "Optima Group",
      budget: 22000,
      chargeEstimeeTotale: 30,
      dateDebut: d(2026, 2, 3),
      dateFin: d(2026, 3, 21),
      statut: "EN_COURS",
      couleur: "#14b8a6",
    },
  });

  const p3e1 = await prisma.etape.create({ data: { projetId: p3.id, nom: "Cahier des charges",        statut: "VALIDEE",  dateDebut: d(2026,2,3),  deadline: d(2026,2,14), chargeEstimeeJours: 8,  ordre: 1 } });
  const p3e2 = await prisma.etape.create({ data: { projetId: p3.id, nom: "Développement Dashboard",   statut: "EN_COURS", dateDebut: d(2026,2,17), deadline: d(2026,3,7),  chargeEstimeeJours: 16, ordre: 2 } });
  await prisma.etape.create({               data: { projetId: p3.id, nom: "Formation & Documentation", statut: "A_FAIRE",  dateDebut: d(2026,3,10), deadline: d(2026,3,21), chargeEstimeeJours: 6,  ordre: 3 } });

  const p3acts: Parameters<typeof prisma.activite.create>[0]["data"][] = [];

  for (const day of pickDays(workingDays(d(2026,2,3), d(2026,2,14)), 0.8)) {
    p3acts.push({ consultantId: julie.id,  projetId: p3.id, etapeId: p3e1.id, date: day, heures: 7, description: "Ateliers besoins métier RH", facturable: true });
    p3acts.push({ consultantId: sophie.id, projetId: p3.id, etapeId: p3e1.id, date: day, heures: 5, description: "Wireframes dashboard analytique", facturable: true });
  }
  for (const day of pickDays(workingDays(d(2026,2,17), d(2026,3,7)), 0.8)) {
    p3acts.push({ consultantId: julie.id,  projetId: p3.id, etapeId: p3e2.id, date: day, heures: 8, description: "Développement Power BI / connecteurs", facturable: true });
    if ((day.getDate() % 3) !== 0) {
      p3acts.push({ consultantId: sophie.id, projetId: p3.id, etapeId: p3e2.id, date: day, heures: 6, description: "UI composants dashboard", facturable: true });
    }
  }

  for (const act of p3acts) await prisma.activite.create({ data: act });
  console.log(`   ✓ ${p3acts.length} activités`);

  const total = p1acts.length + p2acts.length + p3acts.length;
  console.log(`\n✅ Seed demo terminé — 3 projets, 11 étapes, ${total} activités`);
  console.log("   Consultants : Sophie Leroux · Marc Dubois · Julie Chen");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
