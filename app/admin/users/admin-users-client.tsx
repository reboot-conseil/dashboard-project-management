"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { UserPlus, RotateCcw, UserX, UserCheck, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Role = "ADMIN" | "PM" | "CONSULTANT"
const Role = { ADMIN: "ADMIN" as Role, PM: "PM" as Role, CONSULTANT: "CONSULTANT" as Role }

type UserEntry = { id: number; nom: string; email: string; role: Role; actif: boolean; hasAccount: boolean }
const ROLE_LABELS: Record<Role, string> = { ADMIN: "Administrateur", PM: "Chef de projet", CONSULTANT: "Consultant" }

function nameToColor(nom: string): string {
  const hue = nom.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return `hsl(${hue}, 60%, 52%)`;
}

export function AdminUsersClient({ users }: { users: UserEntry[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<UserEntry | null>(null)
  const [editingRole, setEditingRole] = useState<UserEntry | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserEntry | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role>(Role.CONSULTANT)
  const [editRole, setEditRole] = useState<Role>(Role.CONSULTANT)
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ nom: "", email: "", role: "CONSULTANT" as Role, password: "", tjm: "" })

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

  async function updateRole(user: UserEntry, role: Role) {
    setLoading(true)
    try {
      await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consultantId: user.id, role }) })
      toast.success(`Rôle mis à jour pour ${user.nom}`)
      router.refresh(); setEditingRole(null)
    } catch { toast.error("Erreur") } finally { setLoading(false) }
  }

  async function deleteUser(user: UserEntry) {
    setLoading(true)
    try {
      await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consultantId: user.id }) })
      toast.success(`Compte de ${user.nom} supprimé`)
      router.refresh(); setConfirmDelete(null)
    } catch { toast.error("Erreur") } finally { setLoading(false) }
  }

  async function createUser() {
    if (!createForm.nom || !createForm.email || !createForm.password) {
      toast.error("Nom, email et mot de passe sont requis")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          nom: createForm.nom,
          email: createForm.email,
          role: createForm.role,
          password: createForm.password,
          tjm: createForm.tjm !== "" ? createForm.tjm : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Erreur lors de la création")
        return
      }
      toast.success(`Compte créé pour ${createForm.nom}`)
      router.refresh()
      setShowCreate(false)
      setCreateForm({ nom: "", email: "", role: "CONSULTANT", password: "", tjm: "" })
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Équipe <span className="text-muted-foreground font-normal text-sm">({users.length})</span></h2>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" />Nouvel utilisateur
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const color = nameToColor(user.nom);
            const color2 = nameToColor(user.nom + "x");
            const initials = user.nom.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={user.id} className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border bg-card hover:shadow-md transition-all text-center">
                {/* Avatar large */}
                <div
                  className="h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold select-none"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color2})` }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="w-full min-w-0">
                  <p className="font-semibold text-sm truncate">{user.nom}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {(user.hasAccount || user.actif) && (
                    <Badge variant="default" className="text-[10px]">{ROLE_LABELS[user.role]}</Badge>
                  )}
                  {!user.hasAccount && !user.actif && (
                    <Badge variant="outline" className="text-[10px]">Pas de compte</Badge>
                  )}
                  {!user.actif && <Badge variant="destructive" className="text-[10px]">Inactif</Badge>}
                  {user.actif && user.hasAccount && <Badge variant="success" className="text-[10px]">Actif</Badge>}
                  {user.actif && !user.hasAccount && <Badge variant="info" className="text-[10px]">SSO actif</Badge>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-1 flex-wrap justify-center">
                  {!user.hasAccount && (
                    <Button size="sm" variant="outline" onClick={() => setSelected(user)} className="text-xs gap-1">
                      <UserPlus className="h-3 w-3" />{user.actif ? "Ajouter mot de passe" : "Activer"}
                    </Button>
                  )}
                  {user.hasAccount && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingRole(user); setEditRole(user.role); }} className="text-xs gap-1">
                      <Pencil className="h-3 w-3" />Modifier
                    </Button>
                  )}
                  {user.hasAccount && (
                    <Button size="sm" variant="ghost" onClick={() => resetPassword(user)} className="h-8 w-8 p-0" title="Réinitialiser le mot de passe">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {user.hasAccount && (
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(user)} className="h-8 w-8 p-0" title={user.actif ? "Désactiver" : "Réactiver"}>
                      {user.actif ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-green-600" />}
                    </Button>
                  )}
                  {user.hasAccount && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(user)} className="h-8 w-8 p-0" title="Supprimer le compte">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selected && (
        <Card>
          <CardHeader><CardTitle>Activer le compte — {selected.nom}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as Role)}>
                <option value="ADMIN">Administrateur</option>
                <option value="PM">Chef de projet</option>
                <option value="CONSULTANT">Consultant</option>
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

      {editingRole && (
        <Card>
          <CardHeader><CardTitle>Modifier le rôle — {editingRole.nom}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nouveau rôle</Label>
              <Select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
                <option value="ADMIN">Administrateur</option>
                <option value="PM">Chef de projet</option>
                <option value="CONSULTANT">Consultant</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateRole(editingRole, editRole)} disabled={loading}>Enregistrer</Button>
              <Button variant="outline" onClick={() => setEditingRole(null)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {confirmDelete && (
        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-destructive">Supprimer le compte — {confirmDelete.nom}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cette action désactivera le compte et supprimera l&apos;accès de <strong>{confirmDelete.nom}</strong>. Cette action est irréversible.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => deleteUser(confirmDelete)} disabled={loading}>Confirmer la suppression</Button>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Créer un utilisateur</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-nom">Nom complet *</Label>
                <Input id="create-nom" placeholder="Julie Chen" value={createForm.nom}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-email">Email *</Label>
                <Input id="create-email" type="email" placeholder="julie.chen@reboot-conseil.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as Role }))}>
                  <option value="ADMIN">Administrateur</option>
                  <option value="PM">Chef de projet</option>
                  <option value="CONSULTANT">Consultant</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-tjm">TJM €/j (optionnel)</Label>
                <Input id="create-tjm" type="number" min={0} placeholder="600"
                  value={createForm.tjm}
                  onChange={(e) => setCreateForm((f) => ({ ...f, tjm: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Mot de passe initial *</Label>
              <Input id="create-password" type="password" placeholder="Minimum 8 caractères"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={createUser} disabled={loading}>Créer le compte</Button>
              <Button variant="outline" onClick={() => {
                setShowCreate(false)
                setCreateForm({ nom: "", email: "", role: "CONSULTANT", password: "", tjm: "" })
              }}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
