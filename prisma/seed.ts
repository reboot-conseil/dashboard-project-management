import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Helpers pour les dates dynamiques ──────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Seed principal ─────────────────────────────────────────────
async function main() {
  console.log("🧹 Nettoyage des données existantes...");
  await prisma.activite.deleteMany();
  await prisma.etape.deleteMany();
  await prisma.projet.deleteMany();
  await prisma.consultant.deleteMany();

  // ── Consultants ──────────────────────────────────────────────
  console.log("👤 Création des consultants...");

  const alice = await prisma.consultant.create({
    data: {
      nom: "Alice Dupont",
      email: "alice@example.com",
      tjm: 600,
      competences: "React, TypeScript, Node.js",
      actif: true,
    },
  });

  const bob = await prisma.consultant.create({
    data: {
      nom: "Bob Martin",
      email: "bob@example.com",
      tjm: 500,
      competences: "Python, Django, PostgreSQL",
      actif: true,
    },
  });

  const charlie = await prisma.consultant.create({
    data: {
      nom: "Charlie Durand",
      email: "charlie@example.com",
      tjm: 550,
      competences: "Vue.js, Laravel, MySQL",
      actif: true,
    },
  });

  // ── Projets ──────────────────────────────────────────────────
  console.log("📁 Création des projets...");

  const refonteSite = await prisma.projet.create({
    data: {
      nom: "Refonte site web",
      client: "TechCorp",
      budget: 50000,
      statut: "EN_COURS",
      dateDebut: daysAgo(30),
      dateFin: daysFromNow(60),
    },
  });

  const appMobile = await prisma.projet.create({
    data: {
      nom: "Application mobile",
      client: "StartupXYZ",
      budget: 80000,
      statut: "PLANIFIE",
      dateDebut: daysFromNow(7),
      dateFin: daysFromNow(120),
    },
  });

  // ── Activités (8-10, sur les 7 derniers jours) ───────────────
  console.log("📝 Création des activités...");

  const activitesData = [
    {
      consultantId: alice.id,
      projetId: refonteSite.id,
      date: daysAgo(7),
      heures: 7,
      description: "Mise en place de l'architecture frontend",
      facturable: true,
    },
    {
      consultantId: alice.id,
      projetId: refonteSite.id,
      date: daysAgo(6),
      heures: 8,
      description: "Développement composants React",
      facturable: true,
    },
    {
      consultantId: bob.id,
      projetId: refonteSite.id,
      date: daysAgo(6),
      heures: 6,
      description: "Conception API REST",
      facturable: true,
    },
    {
      consultantId: alice.id,
      projetId: refonteSite.id,
      date: daysAgo(5),
      heures: 5,
      description: "Revue de code et corrections",
      facturable: true,
    },
    {
      consultantId: bob.id,
      projetId: refonteSite.id,
      date: daysAgo(4),
      heures: 7,
      description: "Développement endpoints API",
      facturable: true,
    },
    {
      consultantId: alice.id,
      projetId: refonteSite.id,
      date: daysAgo(3),
      heures: 8,
      description: "Intégration design system",
      facturable: true,
    },
    {
      consultantId: bob.id,
      projetId: refonteSite.id,
      date: daysAgo(2),
      heures: 4,
      description: "Tests unitaires API",
      facturable: true,
    },
    {
      consultantId: alice.id,
      projetId: refonteSite.id,
      date: daysAgo(2),
      heures: 6,
      description: "Tests composants frontend",
      facturable: true,
    },
    {
      consultantId: bob.id,
      projetId: refonteSite.id,
      date: daysAgo(1),
      heures: 7,
      description: "Optimisation performances backend",
      facturable: true,
    },
    {
      consultantId: alice.id,
      projetId: refonteSite.id,
      date: daysAgo(1),
      heures: 5,
      description: "Documentation technique",
      facturable: true,
    },
  ];

  for (const activite of activitesData) {
    await prisma.activite.create({ data: activite });
  }

  // ── Étapes : Refonte site web ────────────────────────────────
  console.log("🎯 Création des étapes...");

  const etapesRefonte = [
    {
      projetId: refonteSite.id,
      nom: "Maquettes et wireframes",
      description: "Création des maquettes Figma et wireframes pour toutes les pages",
      statut: "VALIDEE" as const,
      deadline: daysAgo(15),
      ordre: 1,
    },
    {
      projetId: refonteSite.id,
      nom: "Setup environnement",
      description: "Configuration du projet Next.js, CI/CD, et environnement de dev",
      statut: "VALIDEE" as const,
      deadline: daysAgo(10),
      ordre: 2,
    },
    {
      projetId: refonteSite.id,
      nom: "Développement frontend",
      description: "Développement de tous les composants et pages React",
      statut: "EN_COURS" as const,
      deadline: daysFromNow(15),
      ordre: 3,
    },
    {
      projetId: refonteSite.id,
      nom: "Intégration API",
      description: "Connexion frontend-backend et intégration des endpoints",
      statut: "EN_COURS" as const,
      deadline: daysFromNow(20),
      ordre: 4,
    },
    {
      projetId: refonteSite.id,
      nom: "Tests et recette",
      description: "Tests end-to-end, recette client, et corrections de bugs",
      statut: "A_FAIRE" as const,
      deadline: daysFromNow(45),
      ordre: 5,
    },
  ];

  for (const etape of etapesRefonte) {
    await prisma.etape.create({ data: etape });
  }

  // ── Étapes : Application mobile ─────────────────────────────
  const etapesMobile = [
    {
      projetId: appMobile.id,
      nom: "Analyse des besoins",
      description: "Ateliers utilisateurs, spécifications fonctionnelles et techniques",
      statut: "A_FAIRE" as const,
      deadline: daysFromNow(20),
      ordre: 1,
    },
    {
      projetId: appMobile.id,
      nom: "Design UX/UI",
      description: "Parcours utilisateur, maquettes et prototype interactif",
      statut: "A_FAIRE" as const,
      deadline: daysFromNow(40),
      ordre: 2,
    },
    {
      projetId: appMobile.id,
      nom: "Développement",
      description: "Développement React Native, API et base de données",
      statut: "A_FAIRE" as const,
      deadline: daysFromNow(80),
      ordre: 3,
    },
    {
      projetId: appMobile.id,
      nom: "Publication stores",
      description: "Soumission App Store et Google Play, validation et lancement",
      statut: "A_FAIRE" as const,
      deadline: daysFromNow(110),
      ordre: 4,
    },
  ];

  for (const etape of etapesMobile) {
    await prisma.etape.create({ data: etape });
  }

  // ── Résumé ───────────────────────────────────────────────────
  const counts = {
    consultants: await prisma.consultant.count(),
    projets: await prisma.projet.count(),
    activites: await prisma.activite.count(),
    etapes: await prisma.etape.count(),
  };

  console.log("\n✅ Seed terminé avec succès !");
  console.log(`   👤 ${counts.consultants} consultants`);
  console.log(`   📁 ${counts.projets} projets`);
  console.log(`   📝 ${counts.activites} activités`);
  console.log(`   🎯 ${counts.etapes} étapes`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Erreur lors du seed :", e);
    await prisma.$disconnect();
    process.exit(1);
  });
