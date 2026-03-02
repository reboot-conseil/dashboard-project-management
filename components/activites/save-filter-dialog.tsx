"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { Consultant, Projet } from "./types";
import { PERIODES } from "./types";

interface SaveFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveFilterName: string;
  onNameChange: (v: string) => void;
  onSave: () => void;
  consultants: Consultant[];
  projets: Projet[];
  filtreConsultant: string;
  filtreProjet: string;
  filtrePeriode: string;
  filtreFacturable: string;
}

export function SaveFilterDialog({
  open, onOpenChange, saveFilterName, onNameChange, onSave,
  consultants, projets, filtreConsultant, filtreProjet, filtrePeriode, filtreFacturable,
}: SaveFilterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Sauvegarder le filtre actuel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nom du filtre</Label>
            <Input
              placeholder="ex: Mes activités ce mois"
              value={saveFilterName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSave(); }}
            />
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Filtres qui seront sauvegardés :</p>
            <ul className="list-disc list-inside ml-2">
              {filtreConsultant && (
                <li>Consultant : {consultants.find((c) => String(c.id) === filtreConsultant)?.nom}</li>
              )}
              {filtreProjet && (
                <li>Projet : {projets.find((p) => String(p.id) === filtreProjet)?.nom}</li>
              )}
              <li>Période : {PERIODES.find((p) => p.value === filtrePeriode)?.label}</li>
              {filtreFacturable && (
                <li>Facturable : {filtreFacturable === "true" ? "Oui" : "Non"}</li>
              )}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSave}>
            <Bookmark className="h-4 w-4" />
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
