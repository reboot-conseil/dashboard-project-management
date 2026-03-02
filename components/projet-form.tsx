"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const formSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  client: z.string().min(1, "Le client est requis"),
  budget: z.number().min(0, "Le budget doit être positif"),
  chargeEstimeeTotale: z.number().nullable().optional(),
  dateDebut: z.string().min(1, "La date de début est requise"),
  dateFin: z.string(),
  statut: z.enum(["PLANIFIE", "EN_COURS", "EN_PAUSE", "TERMINE"]),
});

type FormValues = z.infer<typeof formSchema>;

export interface ProjetData {
  id?: number;
  nom: string;
  client: string;
  budget: number;
  chargeEstimeeTotale: number | null;
  dateDebut: string;
  dateFin: string;
  statut: "PLANIFIE" | "EN_COURS" | "EN_PAUSE" | "TERMINE";
}

interface ProjetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projet?: ProjetData | null;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function toDateInput(val: string | Date | null | undefined): string {
  if (!val) return "";
  try {
    return format(new Date(val), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function ProjetForm({
  open,
  onOpenChange,
  projet,
  onSuccess,
  onError,
}: ProjetFormProps) {
  const isEditing = !!projet?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: projet
      ? {
          nom: projet.nom,
          client: projet.client,
          budget: projet.budget,
          chargeEstimeeTotale: projet.chargeEstimeeTotale ?? null,
          dateDebut: toDateInput(projet.dateDebut),
          dateFin: toDateInput(projet.dateFin),
          statut: projet.statut,
        }
      : {
          nom: "",
          client: "",
          budget: 0,
          chargeEstimeeTotale: null,
          dateDebut: format(new Date(), "yyyy-MM-dd"),
          dateFin: "",
          statut: "PLANIFIE",
        },
  });

  // Pré-remplir le formulaire quand le dialog s'ouvre
  useEffect(() => {
    if (open && projet) {
      reset({
        nom: projet.nom,
        client: projet.client,
        budget: projet.budget,
        chargeEstimeeTotale: projet.chargeEstimeeTotale ?? null,
        dateDebut: toDateInput(projet.dateDebut),
        dateFin: toDateInput(projet.dateFin),
        statut: projet.statut,
      });
    } else if (open) {
      reset({
        nom: "",
        client: "",
        budget: 0,
        chargeEstimeeTotale: null,
        dateDebut: format(new Date(), "yyyy-MM-dd"),
        dateFin: "",
        statut: "PLANIFIE",
      });
    }
  }, [open, projet, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const url = isEditing ? `/api/projets/${projet!.id}` : "/api/projets";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          chargeEstimeeTotale: values.chargeEstimeeTotale || null,
          dateFin: values.dateFin || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        onError(data.error || "Une erreur est survenue");
        return;
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      onError("Erreur de connexion au serveur");
    }
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le projet" : "Nouveau projet"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du projet."
              : "Remplissez les informations pour créer un nouveau projet."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du projet *</Label>
              <Input id="nom" placeholder="Refonte site web" {...register("nom")} />
              {errors.nom && (
                <p className="text-xs text-destructive">{errors.nom.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Input id="client" placeholder="TechCorp" {...register("client")} />
              {errors.client && (
                <p className="text-xs text-destructive">{errors.client.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (€) *</Label>
              <Input
                id="budget"
                type="number"
                min={0}
                placeholder="50000"
                {...register("budget", { valueAsNumber: true })}
              />
              {errors.budget && (
                <p className="text-xs text-destructive">{errors.budget.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chargeEstimeeTotale">Charge estimée (jours)</Label>
              <Input
                id="chargeEstimeeTotale"
                type="number"
                step={0.5}
                min={0}
                placeholder="ex: 25"
                {...register("chargeEstimeeTotale", { setValueAs: (v) => (v === "" || v === null || v === undefined ? null : parseFloat(v)) })}
              />
              <p className="text-[11px] text-muted-foreground">Auto-calculé si étapes ont charges estimées</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select id="statut" {...register("statut")}>
                <option value="PLANIFIE">Planifié</option>
                <option value="EN_COURS">En cours</option>
                <option value="EN_PAUSE">En pause</option>
                <option value="TERMINE">Terminé</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début *</Label>
              <Input id="dateDebut" type="date" {...register("dateDebut")} />
              {errors.dateDebut && (
                <p className="text-xs text-destructive">{errors.dateDebut.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input id="dateFin" type="date" {...register("dateFin")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Enregistrer" : "Créer le projet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
