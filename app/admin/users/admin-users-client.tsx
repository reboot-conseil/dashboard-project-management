"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Role } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, RotateCcw, UserX, UserCheck } from "lucide-react"
import { toast } from "sonner"

type UserEntry = { id: number; nom: string; email: string; role: Role; actif: boolean; hasAccount: boolean }
const ROLE_LABELS: Record<Role, string> = { ADMIN: "Administrateur", PM: "Chef de projet", CONSULTANT: "Consultant" }

export function AdminUsersClient({ users }: { users: UserEntry[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<UserEntry | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role>(Role.CONSULTANT)
  const [loading, setLoading] = useState(false)

  async function activateAccount() {
    if (!selected || !newPassword) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consultantId: selected.id, role: selectedRole, password: newPassword }) })
      if (!res.ok) throw new Error()
      toast.success(`Compte activé pour ${selected.nom}`)
      router.refresh(); setSelected(null); setNewPassword("")
    } catch { toast.error("Erreur lors de l'activation") } finally { setLoading(false) }
  }

  async function resetPassword(user: UserEntry) {
    const password = prompt(`Nouveau mot de passe pour ${user.nom} :`)
    if (!password) return
    setLoading(true)
    try {
      await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consultantId: user.id, password }) })
      toast.success("Mot de passe réinitialisé")
    } catch { toast.error("Erreur") } finally { setLoading(false) }
  }

  async function toggleActive(user: UserEntry) {
    setLoading(true)
    try {
      await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consultantId: user.id, actif: !user.actif }) })
      toast.success(user.actif ? "Compte désactivé" : "Compte réactivé"); router.refresh()
    } catch { toast.error("Erreur") } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Equipe ({users.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{user.nom}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {user.hasAccount ? <Badge variant="default">{ROLE_LABELS[user.role]}</Badge> : <Badge variant="outline">Pas de compte</Badge>}
                  {!user.actif && <Badge variant="destructive">Inactif</Badge>}
                  <div className="flex gap-1">
                    {!user.hasAccount && <Button size="sm" variant="outline" onClick={() => setSelected(user)}><UserPlus className="h-3.5 w-3.5" /></Button>}
                    {user.hasAccount && <Button size="sm" variant="ghost" onClick={() => resetPassword(user)}><RotateCcw className="h-3.5 w-3.5" /></Button>}
                    {user.hasAccount && <Button size="sm" variant="ghost" onClick={() => toggleActive(user)}>{user.actif ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-green-600" />}</Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {selected && (
        <Card>
          <CardHeader><CardTitle>Activer le compte — {selected.nom}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                  <SelectItem value="PM">Chef de projet</SelectItem>
                  <SelectItem value="CONSULTANT">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Mot de passe initial</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 caractères" />
            </div>
            <div className="flex gap-2">
              <Button onClick={activateAccount} disabled={loading || !newPassword}>Activer le compte</Button>
              <Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
