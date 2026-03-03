import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@company.com"
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!"
  const nom = process.env.ADMIN_NOM ?? "Administrateur"
  const hash = await bcrypt.hash(password, 12)
  const admin = await prisma.consultant.upsert({
    where: { email },
    update: { password: hash, role: "ADMIN", actif: true },
    create: { nom, email, password: hash, role: "ADMIN", actif: true },
  })
  console.log(`✅ Compte ADMIN créé/mis à jour : ${admin.email}`)
  console.log(`   Mot de passe : ${password}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
