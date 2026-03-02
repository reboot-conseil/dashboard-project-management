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
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const formSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  description: z.string(),
  deadline: z.string(),
  chargeEstimeeJours: z.number().nullable().optional(),
  ordre: z.number().int(),
  statut: z.enum(["A_FAIRE", "EN_COURS", "VALIDEE"]),
});

type FormValues = z.infer<typeof formSchema>;

export interface EtapeData {
  id?: number;
  projetId: number;
  nom: string;
  description: string;
  deadline: string;
  chargeEstimeeJours: number | null;
  ordre: number;
  statut: "A_FAIRE" | "EN_COURS" | "VALIDEE";
}

interface EtapeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etape?: EtapeData | null;
  projetId: number;
  nextOrdre: number;
  defaultStatut?: "A_FAIRE" | "EN_COURS" | "VALIDEE";
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

export function EtapeForm({
  open,
  onOpenChange,
  etape,
  projetId,
  nextOrdre,
  defaultStatut = "A_FAIRE",
  onSuccess,
  onError,
}: EtapeFormProps) {
  const isEditing = !!etape?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: etape
      ? {
          nom: etape.nom,
          description: etape.description ?? "",
          deadline: toDateInput(etape.deadline),
          chargeEstimeeJours: etape.chargeEstimeeJours ?? null,
          ordre: etape.ordre,
          statut: etape.statut,
        }
      : {
          nom: "",
          description: "",
          deadline: "",
          chargeEstimeeJours: null,
          ordre: nextOrdre,
          statut: defaultStatut,
        },
  });

  // Pré-remplir le formulaire quand le dialog s'ouvre
  useEffect(() => {
    if (open && etape) {
      reset({
        nom: etape.nom,
        description: etape.description ?? "",
        deadline: toDateInput(etape.deadline),
        chargeEstimeeJours: etape.chargeEstimeeJours ?? null,
        ordre: etape.ordre,
        statut: etape.statut,
      });
    } else if (open) {
      reset({
        nom: "",
        description: "",
        deadline: "",
        chargeEstimeeJours: null,
        ordre: nextOrdre,
        statut: defaultStatut,
      });
    }
  }, [open, etape, reset, nextOrdre, defaultStatut]);

  async function onSubmit(values: FormValues) {
    try {
      const url = isEditing ? `/api/etapes/${etape!.id}` : "/api/etapes";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          projetId,
          description: values.description || null,
          deadline: values.deadline || null,
          chargeEstimeeJours: values.chargeEstimeeJours || null,
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
            {isEditing ? "Modifier l'étape" : "Nouvelle étape"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="etape-nom">Nom *</Label>
            <Input id="etape-nom" placeholder="Nom de l'étape" {...register("nom")} />
            {errors.nom && (
              <p className="text-xs text-destructive">{errors.nom.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="etape-desc">Description</Label>
            <Textarea
              id="etape-desc"
              placeholder="Description de l'étape..."
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etape-deadline">Deadline</Label>
              <Input id="etape-deadline" type="date" {...register("deadline")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="etape-charge">Charge estimée (jours)</Label>
              <Input
                id="etape-charge"
                type="number"
                step={0.5}
                min={0}
                placeholder="ex: 2.5"
                {...register("chargeEstimeeJours", { setValueAs: (v) => (v === "" || v === null || v === undefined ? null : parseFloat(v)) })}
              />
              <p className="text-[11px] text-muted-foreground">Estimation du temps nécessaire pour cette étape</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etape-ordre">Ordre</Label>
              <Input
                id="etape-ordre"
                type="number"
                min={1}
                {...register("ordre", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="etape-statut">Statut</Label>
              <Select id="etape-statut" {...register("statut")}>
                <option value="A_FAIRE">À faire</option>
                <option value="EN_COURS">En cours</option>
                <option value="VALIDEE">Validée</option>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
