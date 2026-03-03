"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Users, Pencil, ToggleLeft, ToggleRight, ArrowUpRight, ArrowDownRight, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ConsultantForm,
  type ConsultantData,
} from "@/components/consultant-form";

interface Consultant {
  id: number;
  nom: string;
  email: string;
  tjm: string | number;
  coutJournalierEmployeur: number | null;
  competences: string | null;
  actif: boolean;
}

interface ConsultantKpi {
  id: number;
  tauxOccupation: number;
  caMois: number;
  caMoisPrecedent: number;
}

function exportCsvConsultants(consultants: Consultant[]) {
  const rows = [
    ["Nom", "Email", "TJM (EUR)", "Actif"],
    ...consultants.map((c) => [
      c.nom ?? "",
      c.email ?? "",
      String(Number(c.tjm ?? 0)),
      c.actif ? "Oui" : "Non",
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consultants-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ConsultantsPage() {
  const router = useRouter();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] =
    useState<ConsultantData | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [kpis, setKpis] = useState<Map<number, ConsultantKpi>>(new Map());

  // Fetch KPI data for consultants
  const fetchKpis = useCallback(async () => {
    try {
      const now = new Date();
      const moisDebut = format(startOfMonth(now), "yyyy-MM-dd");
      const moisFin = format(endOfMonth(now), "yyyy-MM-dd");
      const prevDebut = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const prevFin = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

      const [rapRes, prevRes] = await Promise.all([
        fetch(`/api/rapports?dateDebut=${moisDebut}&dateFin=${moisFin}`),
        fetch(`/api/rapports?dateDebut=${prevDebut}&dateFin=${prevFin}`),
      ]);
      const [rapData, prevData] = await Promise.all([rapRes.json(), prevRes.json()]);

      const joursOuvres = Math.round(30 * 5 / 7);
      const capacite = joursOuvres * 8;

      const map = new Map<number, ConsultantKpi>();
      for (const c of (rapData.parConsultant ?? [])) {
        const prevC = (prevData.parConsultant ?? []).find((pc: { id: number }) => pc.id === c.id);
        map.set(c.id, {
          id: c.id,
          tauxOccupation: capacite > 0 ? Math.round((c.heuresTotal / capacite) * 100) : 0,
          caMois: c.ca ?? 0,
          caMoisPrecedent: prevC?.ca ?? 0,
        });
      }
      setKpis(map);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const fetchConsultants = useCallback(async () => {
    try {
      const res = await fetch("/api/consultants");
      const data = await res.json();
      setConsultants(data);
    } catch {
      toast.error("Erreur lors du chargement des consultants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsultants();
  }, [fetchConsultants]);

  function handleAdd() {
    setEditingConsultant(null);
    setDialogOpen(true);
  }

  function handleEdit(c: Consultant) {
    setEditingConsultant({
      id: c.id,
      nom: c.nom,
      email: c.email,
      tjm: Number(c.tjm),
      coutJournalierEmployeur: c.coutJournalierEmployeur,
      competences: c.competences ?? "",
      actif: c.actif,
    });
    setDialogOpen(true);
  }

  async function handleToggle(c: Consultant) {
    setTogglingId(c.id);
    try {
      const res = await fetch(`/api/consultants/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !c.actif }),
      });
      if (!res.ok) {
        toast.error("Erreur lors de la modification");
        return;
      }
      toast.success(
        c.actif
          ? `${c.nom} a été désactivé`
          : `${c.nom} a été réactivé`
      );
      fetchConsultants();
      router.refresh();
    } catch {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setTogglingId(null);
    }
  }

  function handleSuccess() {
    toast.success(
      editingConsultant
        ? "Consultant modifié avec succès !"
        : "Consultant ajouté avec succès !"
    );
    fetchConsultants();
    router.refresh();
  }

  function handleError(message: string) {
    toast.error(message);
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Consultants"
        subtitle={`${consultants.length} consultant${consultants.length > 1 ? "s" : ""}`}
        icon={<Users className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsvConsultants(consultants)}>
              <Download className="h-4 w-4 mr-1.5" />
              Exporter CSV
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Nouveau consultant
            </Button>
          </div>
        }
      />

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>TJM</TableHead>
              <TableHead>Coût Employeur</TableHead>
              <TableHead>Compétences</TableHead>
              <TableHead className="text-right">Occupation</TableHead>
              <TableHead className="text-right">CA ce mois</TableHead>
              <TableHead className="text-center">Tendance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : consultants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Aucun consultant. Cliquez sur &quot;Ajouter un consultant&quot; pour commencer.
                </TableCell>
              </TableRow>
            ) : (
              consultants.map((c) => {
                const kpi = kpis.get(c.id);
                const tendance = kpi ? kpi.caMois - kpi.caMoisPrecedent : 0;
                return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nom}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email}
                  </TableCell>
                  <TableCell>{Number(c.tjm).toLocaleString("fr-FR")} €</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.coutJournalierEmployeur != null
                      ? `${c.coutJournalierEmployeur.toLocaleString("fr-FR")} €`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.competences
                        ?.split(",")
                        .map((comp) => comp.trim())
                        .filter(Boolean)
                        .map((comp) => (
                          <Badge
                            key={comp}
                            variant="secondary"
                            className="text-xs"
                          >
                            {comp}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {kpi ? (
                      <Badge
                        variant={kpi.tauxOccupation > 90 ? "destructive" : kpi.tauxOccupation > 70 ? "success" : "warning"}
                        className="text-xs"
                      >
                        {kpi.tauxOccupation}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {kpi ? (
                      <span className="text-sm font-medium">
                        {kpi.caMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {kpi ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${tendance >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {tendance >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.actif ? "success" : "secondary"}>
                      {c.actif ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(c)}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(c)}
                        disabled={togglingId === c.id}
                        title={c.actif ? "Désactiver" : "Activer"}
                      >
                        {c.actif ? (
                          <ToggleRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Form */}
      <ConsultantForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        consultant={editingConsultant}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
