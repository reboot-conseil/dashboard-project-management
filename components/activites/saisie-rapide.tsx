"use client";

import { RefObject } from "react";
import { format } from "date-fns";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Consultant, Projet, Etape, Activite } from "./types";

export interface SaisieRapideFormState {
  consultantId: string;
  projetId: string;
  etapeId: string;
  date: string;
  heures: string;
  description: string;
  facturable: boolean;
}

interface SaisieRapideProps {
  consultants: Consultant[];
  projets: Projet[];
  etapes: Etape[];
  etapesLoading: boolean;
  activites: Activite[];
  form: SaisieRapideFormState;
  saving: boolean;
  heuresRef: RefObject<HTMLInputElement | null>;
  isConsultantRole?: boolean;
  onFormChange: (field: keyof SaisieRapideFormState, value: string | boolean) => void;
  onSave: () => void;
}

export function SaisieRapide({
  consultants, projets, etapes, etapesLoading, activites,
  form, saving, heuresRef, isConsultantRole, onFormChange, onSave,
}: SaisieRapideProps) {
  const selectedEtape = form.etapeId ? etapes.find((e) => String(e.id) === form.etapeId) : null;
  const chargeInfo = selectedEtape?.chargeEstimeeJours
    ? (() => {
        const heuresSur = activites
          .filter((a) => a.etape?.id === parseInt(form.etapeId))
          .reduce((s, a) => s + Number(a.heures), 0);
        const joursRealises = heuresSur / 8;
        const restant = selectedEtape.chargeEstimeeJours! - joursRealises;
        return { joursRealises, restant, depasse: restant < 0, charge: selectedEtape.chargeEstimeeJours! };
      })()
    : null;

  return (
    <div data-testid="saisie-rapide">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="saisie-consultant" className="text-xs">Consultant</Label>
            {isConsultantRole ? (
              <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                {consultants.find((c) => String(c.id) === form.consultantId)?.nom ?? "—"}
              </div>
            ) : (
              <Select id="saisie-consultant" value={form.consultantId} onChange={(e) => onFormChange("consultantId", e.target.value)}>
                <option value="">Choisir...</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saisie-projet" className="text-xs">Projet</Label>
            <Select id="saisie-projet" value={form.projetId} onChange={(e) => onFormChange("projetId", e.target.value)}>
              <option value="">Choisir...</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saisie-etape" className="text-xs">Étape (opt.)</Label>
            <Select
              id="saisie-etape"
              value={form.etapeId}
              onChange={(e) => onFormChange("etapeId", e.target.value)}
              disabled={!form.projetId || etapesLoading}
            >
              <option value="">
                {!form.projetId
                  ? "Sélectionnez un projet"
                  : etapesLoading
                    ? "Chargement..."
                    : etapes.length === 0
                      ? "Aucune étape disponible"
                      : "Aucune étape spécifique"}
              </option>
              {etapes.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.nom} ({et.statut === "A_FAIRE" ? "À faire" : et.statut === "EN_COURS" ? "En cours" : "Validée"})
                  {et.chargeEstimeeJours ? ` — ${et.chargeEstimeeJours}j est.` : ""}
                </option>
              ))}
            </Select>
            {chargeInfo && (
              <div className={`text-[11px] mt-1 px-2 py-1 rounded ${chargeInfo.depasse ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`} data-testid="charge-info">
                {chargeInfo.depasse ? "⚠️ " : "📊 "}
                Estimé : {chargeInfo.charge}j · Saisi : {chargeInfo.joursRealises.toFixed(1)}j
                {chargeInfo.depasse
                  ? ` · Dépassement : +${Math.abs(chargeInfo.restant).toFixed(1)}j`
                  : ` · Reste : ${chargeInfo.restant.toFixed(1)}j`}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saisie-date" className="text-xs">Date</Label>
            <Input
              id="saisie-date"
              type="date"
              value={form.date}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => onFormChange("date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saisie-heures" className="text-xs">Heures</Label>
            <Input
              id="saisie-heures"
              ref={heuresRef}
              type="number"
              step={0.5}
              min={0}
              max={24}
              placeholder="ex: 7.5"
              value={form.heures}
              onChange={(e) => onFormChange("heures", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saisie-description" className="text-xs">Description</Label>
            <Input
              id="saisie-description"
              placeholder="ex: Développement features"
              value={form.description}
              onChange={(e) => onFormChange("description", e.target.value)}
            />
          </div>
          {/* Dernière ligne : facturable + enregistrer — col-span-full pour éviter le débordement */}
          <div className="col-span-full flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="saisie-facturable"
                checked={form.facturable}
                onCheckedChange={(v) => onFormChange("facturable", v as boolean)}
              />
              <Label htmlFor="saisie-facturable" className="text-xs cursor-pointer">Facturable</Label>
            </div>
            <Button
              onClick={onSave}
              disabled={saving}
              className="min-w-[140px]"
              data-testid="btn-enregistrer"
            >
              <Save className="h-4 w-4" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      <p className="text-xs text-muted-foreground mt-2">
        Raccourci : <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd> pour enregistrer
      </p>
    </div>
  );
}
