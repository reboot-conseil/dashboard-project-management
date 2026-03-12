import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/page-header"
import { AdminUsersClient } from "./admin-users-client"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/")
  const consultants = await prisma.consultant.findMany({
    select: { id: true, nom: true, email: true, role: true, actif: true, password: true, tjm: true, coutJournalierEmployeur: true },
    orderBy: { nom: "asc" },
  })
  const users = consultants.map((c) => ({ ...c, hasAccount: !!c.password, password: undefined, tjm: c.tjm !== null ? Number(c.tjm) : null, coutJournalierEmployeur: c.coutJournalierEmployeur !== null ? Number(c.coutJournalierEmployeur) : null }))
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Gestion des utilisateurs" subtitle="Activez et gérez les comptes d'accès de l'équipe" />
      <AdminUsersClient users={users} />
    </div>
  )
}
