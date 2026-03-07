"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertDialog } from "@/components/ui/alert-dialog";
import type { Consultant, Projet, Etape, Activite, Totaux, SavedFilter, EditForm } from "@/components/activites/types";
import { getPeriodeDates } from "@/components/activites/types";
import { SaisieRapide } from "@/components/activites/saisie-rapide";
import type { SaisieRapideFormState } from "@/components/activites/saisie-rapide";
import { ActivitesList } from "@/components/activites/activites-list";
import { ActivitesFeed } from "@/components/activites/activites-feed";
import { EditDialog } from "@/components/activites/edit-dialog";
import { SaveFilterDialog } from "@/components/activites/save-filter-dialog";
import { Clock, Download, List, LayoutList, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function exportCsvActivites(activites: Activite[]) {
  const rows = [
    ["Date", "Consultant", "Projet", "Etape", "Heures", "Facturable", "Description"],
    ...activites.map((a) => [
      a.date ?? "",
      a.consultant?.nom ?? "",
      a.projet?.nom ?? "",
      a.etape?.nom ?? "",
      String(Number(a.heures ?? 0)),
      a.facturable ? "Oui" : "Non",
      a.description ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activites-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ActivitesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const heuresRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<"table" | "feed">("table");
  const [saisieOpen, setSaisieOpen] = useState(false);

  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [etapesLoading, setEtapesLoading] = useState(false);

  const [form, setForm] = useState<SaisieRapideFormState>({
    consultantId: "",
    projetId: "",
    etapeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    heures: "",
    description: "",
    facturable: true,
  });
  const [saving, setSaving] = useState(false);

  const [activites, setActivites] = useState<Activite[]>([]);
  const [totaux, setTotaux] = useState<Totaux>({ total: 0, facturable: 0, nonFacturable: 0 });
  const [loading, setLoading] = useState(true);
  const [filtreConsultant, setFiltreConsultant] = useState("");
  const [filtreProjet, setFiltreProjet] = useState("");
  const [filtrePeriode, setFiltrePeriode] = useState("month");
  const [filtreFacturable] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingActivite, setEditingActivite] = useState<Activite | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ consultantId: "", projetId: "", etapeId: "", date: "", heures: "", description: "", facturable: true });
  const [editEtapes, setEditEtapes] = useState<Etape[]>([]);
  const [editEtapesLoading, setEditEtapesLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingActivite, setDeletingActivite] = useState<Activite | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [savedFiltersOpen, setSavedFiltersOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("activites-filtres-sauvegardes");
      if (saved) setSavedFilters(JSON.parse(saved));
    } catch {}
  }, []);

  function persistSavedFilters(filters: SavedFilter[]) {
    setSavedFilters(filters);
    localStorage.setItem("activites-filtres-sauvegardes", JSON.stringify(filters));
  }

  function handleSaveFilter() {
    if (!saveFilterName.trim()) { toast.error("Donnez un nom au filtre"); return; }
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      nom: saveFilterName.trim(),
      consultantId: filtreConsultant,
      projetId: filtreProjet,
      periode: filtrePeriode,
      facturable: filtreFacturable,
    };
    persistSavedFilters([...savedFilters, newFilter]);
    setSaveFilterName("");
    setSaveFilterDialogOpen(false);
    toast.success(`Filtre "${newFilter.nom}" sauvegardé !`);
  }

  function applyFilter(f: SavedFilter) {
    setFiltreConsultant(f.consultantId);
    setFiltreProjet(f.projetId);
    setFiltrePeriode(f.periode);
    setSavedFiltersOpen(false);
    toast.success(`Filtre "${f.nom}" appliqué`);
  }

  function deleteFilter(id: string) {
    persistSavedFilters(savedFilters.filter((f) => f.id !== id));
    toast.success("Filtre supprimé");
  }

  useEffect(() => {
    async function loadRef() {
      const [cRes, pRes] = await Promise.all([fetch("/api/consultants"), fetch("/api/projets?statut=EN_COURS")]);
      const cData = await cRes.json();
      const pData = await pRes.json();
      const activeConsultants = cData.filter((c: { actif: boolean }) => c.actif);
      setConsultants(activeConsultants);
      setProjets(pData);
      const lastC = localStorage.getItem("lastConsultantId");
      const lastP = localStorage.getItem("lastProjetId");
      if (lastC && activeConsultants.find((c: Consultant) => c.id === parseInt(lastC)))
        setForm((f) => ({ ...f, consultantId: lastC }));
      if (lastP && pData.find((p: Projet) => p.id === parseInt(lastP)))
        setForm((f) => ({ ...f, projetId: lastP }));
    }
    loadRef();
  }, []);

  // Pré-sélection consultant selon session (CONSULTANT role: forcé, autres: seulement si pas de préférence)
  useEffect(() => {
    if (!session?.user?.id || consultants.length === 0) return;
    const sessionId = session.user.id;
    const isConsultantRole = (session.user as { role?: string }).role === "CONSULTANT";
    const match = consultants.find((c) => String(c.id) === sessionId);
    if (!match) return;
    setForm((f) => {
      if (isConsultantRole || !f.consultantId) return { ...f, consultantId: sessionId };
      return f;
    });
  }, [session, consultants]);

  const fetchEtapes = useCallback(async (projetId: string) => {
    if (!projetId) { setEtapes([]); setEtapesLoading(false); return; }
    setEtapesLoading(true);
    try {
      const res = await fetch(`/api/etapes?projetId=${projetId}`);
      const json = await res.json();
      setEtapes(Array.isArray(json) ? json : (json.etapes ?? []));
    } catch { setEtapes([]); }
    finally { setEtapesLoading(false); }
  }, []);

  useEffect(() => {
    fetchEtapes(form.projetId);
    setForm((f) => ({ ...f, etapeId: "" }));
  }, [form.projetId, fetchEtapes]);

  const fetchActivites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtreConsultant) params.set("consultantId", filtreConsultant);
      if (filtreProjet) params.set("projetId", filtreProjet);
      if (filtreFacturable === "true") params.set("facturable", "true");
      if (filtreFacturable === "false") params.set("facturable", "false");
      const dates = getPeriodeDates(filtrePeriode);
      if (dates.dateDebut) params.set("dateDebut", dates.dateDebut);
      if (dates.dateFin) params.set("dateFin", dates.dateFin);
      const res = await fetch(`/api/activites?${params}`);
      const data = await res.json();
      setActivites(data.activites);
      setTotaux(data.totaux);
    } catch { toast.error("Erreur de chargement"); }
    finally { setLoading(false); }
  }, [filtreConsultant, filtreProjet, filtrePeriode, filtreFacturable]);

  useEffect(() => { fetchActivites(); }, [fetchActivites]);

  async function handleQuickSave() {
    if (!form.consultantId || !form.projetId || !form.heures) {
      toast.error("Remplissez consultant, projet et heures");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/activites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: parseInt(form.consultantId),
          projetId: parseInt(form.projetId),
          etapeId: form.etapeId ? parseInt(form.etapeId) : null,
          date: form.date,
          heures: parseFloat(form.heures),
          description: form.description || null,
          facturable: form.facturable,
        }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Erreur"); return; }
      toast.success("Activité enregistrée !");
      localStorage.setItem("lastConsultantId", form.consultantId);
      localStorage.setItem("lastProjetId", form.projetId);
      setForm((f) => ({ ...f, heures: "", description: "", etapeId: "" }));
      fetchActivites();
      router.refresh();
      setTimeout(() => heuresRef.current?.focus(), 100);
    } catch { toast.error("Erreur de connexion"); }
    finally { setSaving(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleQuickSave(); }
  }

  async function openEdit(a: Activite) {
    setEditingActivite(a);
    setEditForm({
      consultantId: String(a.consultant.id),
      projetId: String(a.projet.id),
      etapeId: a.etape ? String(a.etape.id) : "",
      date: format(new Date(a.date), "yyyy-MM-dd"),
      heures: String(Number(a.heures)),
      description: a.description ?? "",
      facturable: a.facturable,
    });
    setEditDialogOpen(true);
    setEditEtapesLoading(true);
    try {
      const res = await fetch(`/api/etapes?projetId=${a.projet.id}`);
      const json = await res.json();
      setEditEtapes(Array.isArray(json) ? json : (json.etapes ?? []));
    } catch { setEditEtapes([]); }
    finally { setEditEtapesLoading(false); }
  }

  async function handleEditSave() {
    if (!editingActivite) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/activites/${editingActivite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: parseInt(editForm.consultantId),
          projetId: parseInt(editForm.projetId),
          etapeId: editForm.etapeId ? parseInt(editForm.etapeId) : null,
          date: editForm.date,
          heures: parseFloat(editForm.heures),
          description: editForm.description || null,
          facturable: editForm.facturable,
        }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Erreur"); return; }
      toast.success("Activité modifiée !");
      setEditDialogOpen(false);
      fetchActivites();
    } catch { toast.error("Erreur de connexion"); }
    finally { setEditSaving(false); }
  }

  function handleEditProjetChange(projetId: string) {
    setEditForm((f) => ({ ...f, projetId, etapeId: "" }));
    setEditEtapesLoading(true);
    fetch(`/api/etapes?projetId=${projetId}`)
      .then((r) => r.json())
      .then((json) => setEditEtapes(Array.isArray(json) ? json : (json.etapes ?? [])))
      .catch(() => setEditEtapes([]))
      .finally(() => setEditEtapesLoading(false));
  }

  function openDelete(a: Activite) { setDeletingActivite(a); setDeleteDialogOpen(true); }

  async function handleDelete() {
    if (!deletingActivite) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/activites/${deletingActivite.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erreur lors de la suppression"); return; }
      toast.success("Activité supprimée");
      setDeleteDialogOpen(false);
      fetchActivites();
      router.refresh();
    } catch { toast.error("Erreur de connexion"); }
    finally { setDeleting(false); }
  }

  return (
    <div className="p-6 space-y-6" onKeyDown={handleKeyDown}>

      {/* ── Page title ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold">Activités</h1>
          <span className="text-sm text-muted-foreground">
            {activites.length} activité{activites.length > 1 ? "s" : ""}
            {totaux && Number(totaux.total) > 0 && ` · ${totaux.total}h`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Table / Feed */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors${viewMode === "table" ? " bg-primary text-primary-foreground" : " bg-card text-muted-foreground hover:bg-muted"}`}
            >
              <List className="h-3.5 w-3.5" />Table
            </button>
            <button
              onClick={() => setViewMode("feed")}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors${viewMode === "feed" ? " bg-primary text-primary-foreground" : " bg-card text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutList className="h-3.5 w-3.5" />Feed
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportCsvActivites(activites)}>
            <Download className="h-4 w-4 mr-1.5" />Exporter
          </Button>
          <Button size="sm" onClick={() => setSaisieOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Saisir une activité
          </Button>
        </div>
      </div>

      {/* Dialog Saisie Rapide */}
      <Dialog open={saisieOpen} onOpenChange={setSaisieOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Saisir une activité</DialogTitle>
          </DialogHeader>
          <SaisieRapide
            consultants={consultants}
            projets={projets}
            etapes={etapes}
            etapesLoading={etapesLoading}
            activites={activites}
            form={form}
            saving={saving}
            heuresRef={heuresRef}
            isConsultantRole={(session?.user as { role?: string })?.role === "CONSULTANT"}
            onFormChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
            onSave={async () => { await handleQuickSave(); setSaisieOpen(false); }}
          />
        </DialogContent>
      </Dialog>

      {viewMode === "feed" ? (
        <ActivitesFeed activites={activites} onEdit={openEdit} onDelete={openDelete} />
      ) : (
      <ActivitesList
        activites={activites}
        totaux={totaux}
        loading={loading}
        consultants={consultants}
        projets={projets}
        filtreConsultant={filtreConsultant}
        filtreProjet={filtreProjet}
        filtrePeriode={filtrePeriode}
        filtreFacturable={filtreFacturable}
        savedFilters={savedFilters}
        savedFiltersOpen={savedFiltersOpen}
        onFiltreConsultant={setFiltreConsultant}
        onFiltreProjet={setFiltreProjet}
        onFiltrePeriode={setFiltrePeriode}
        onFiltreFacturable={() => {}}
        onToggleSavedFilters={() => setSavedFiltersOpen((v) => !v)}
        onOpenSaveFilterDialog={() => setSaveFilterDialogOpen(true)}
        onApplyFilter={applyFilter}
        onDeleteFilter={deleteFilter}
        onEdit={openEdit}
        onDelete={openDelete}
      />
      )}

      <EditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        consultants={consultants}
        projets={projets}
        editEtapes={editEtapes}
        editEtapesLoading={editEtapesLoading}
        editForm={editForm}
        editSaving={editSaving}
        onFormChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
        onProjetChange={handleEditProjetChange}
        onSave={handleEditSave}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer cette activité ?"
        description={
          deletingActivite
            ? `Êtes-vous sûr de vouloir supprimer l'activité de ${deletingActivite.consultant.nom} (${Number(deletingActivite.heures)}h le ${format(new Date(deletingActivite.date), "dd/MM/yyyy")}) ?`
            : ""
        }
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleting}
      />

      <SaveFilterDialog
        open={saveFilterDialogOpen}
        onOpenChange={setSaveFilterDialogOpen}
        saveFilterName={saveFilterName}
        onNameChange={setSaveFilterName}
        onSave={handleSaveFilter}
        consultants={consultants}
        projets={projets}
        filtreConsultant={filtreConsultant}
        filtreProjet={filtreProjet}
        filtrePeriode={filtrePeriode}
        filtreFacturable={filtreFacturable}
      />
    </div>
  );
}
