/**
 * Script one-shot de migration SQLite → PostgreSQL.
 * Usage: SQLITE_URL="file:./prisma/dev.db" DATABASE_URL="postgresql://..." npx tsx prisma/migrate-data.ts
 */
import { PrismaClient } from "@prisma/client"

const sqliteClient = new PrismaClient({
  datasourceUrl: process.env.SQLITE_URL ?? "file:./prisma/dev.db",
})

const pgClient = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})

async function migrate() {
  console.log("📦 Lecture des données SQLite...")

  const consultants = await sqliteClient.consultant.findMany()
  const projets = await sqliteClient.projet.findMany()
  const etapes = await sqliteClient.etape.findMany()
  const activites = await sqliteClient.activite.findMany()

  console.log(`  ${consultants.length} consultants, ${projets.length} projets, ${etapes.length} étapes, ${activites.length} activités`)

  console.log("\n🚀 Import vers PostgreSQL...")

  for (const c of consultants) {
    await pgClient.consultant.upsert({ where: { email: c.email }, update: c, create: c })
  }
  console.log(`  ✅ ${consultants.length} consultants`)

  for (const p of projets) {
    await pgClient.projet.upsert({ where: { id: p.id }, update: p, create: p })
  }
  console.log(`  ✅ ${projets.length} projets`)

  for (const e of etapes) {
    await pgClient.etape.upsert({ where: { id: e.id }, update: e, create: e })
  }
  console.log(`  ✅ ${etapes.length} étapes`)

  for (const a of activites) {
    await pgClient.activite.upsert({ where: { id: a.id }, update: a, create: a })
  }
  console.log(`  ✅ ${activites.length} activités`)

  console.log("\n🎉 Migration terminée !")
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await sqliteClient.$disconnect()
    await pgClient.$disconnect()
  })
