"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { Consultant, Projet, Etape, EditForm } from "./types";

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultants: Consultant[];
  projets: Projet[];
  editEtapes: Etape[];
  editEtapesLoading: boolean;
  editForm: EditForm;
  editSaving: boolean;
  onFormChange: (patch: Partial<EditForm>) => void;
  onProjetChange: (projetId: string) => void;
  onSave: () => void;
}

export function EditDialog({
  open, onOpenChange, consultants, projets,
  editEtapes, editEtapesLoading, editForm, editSaving,
  onFormChange, onProjetChange, onSave,
}: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;activité</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-consultant" className="text-xs">Consultant</Label>
              <Select
                id="edit-consultant"
                value={editForm.consultantId}
                onChange={(e) => onFormChange({ consultantId: e.target.value })}
              >
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-projet" className="text-xs">Projet</Label>
              <Select
                id="edit-projet"
                value={editForm.projetId}
                onChange={(e) => onProjetChange(e.target.value)}
              >
                {projets.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-etape" className="text-xs">Étape (optionnel)</Label>
            <Select
              id="edit-etape"
              value={editForm.etapeId}
              onChange={(e) => onFormChange({ etapeId: e.target.value })}
              disabled={editEtapesLoading}
            >
              <option value="">
                {editEtapesLoading
                  ? "Chargement..."
                  : editEtapes.length === 0
                    ? "Aucune étape disponible"
                    : "Aucune étape spécifique"}
              </option>
              {editEtapes.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.nom} ({et.statut === "A_FAIRE" ? "À faire" : et.statut === "EN_COURS" ? "En cours" : "Validée"})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-date" className="text-xs">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => onFormChange({ date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-heures" className="text-xs">Heures</Label>
              <Input
                id="edit-heures"
                type="number"
                step={0.5}
                min={0}
                max={24}
                value={editForm.heures}
                onChange={(e) => onFormChange({ heures: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description" className="text-xs">Description</Label>
            <Input
              id="edit-description"
              value={editForm.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-facturable"
              checked={editForm.facturable}
              onCheckedChange={(v) => onFormChange({ facturable: v as boolean })}
            />
            <Label htmlFor="edit-facturable" className="text-xs cursor-pointer">Facturable</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSave} disabled={editSaving}>
            {editSaving ? "..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
