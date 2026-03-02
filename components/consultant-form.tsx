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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const CONSULTANT_PALETTE = [
  "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#06B6D4", "#F97316", "#6366F1", "#84CC16",
];

const formSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Veuillez entrer un email valide"),
  tjm: z.number().min(0, "Le TJM doit être positif"),
  coutJournalierEmployeur: z.number().min(0).nullable(),
  competences: z.string(),
  couleur: z.string(),
  actif: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export interface ConsultantData {
  id?: number;
  nom: string;
  email: string;
  tjm: number;
  coutJournalierEmployeur: number | null;
  competences: string;
  couleur?: string;
  actif: boolean;
}

interface ConsultantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultant?: ConsultantData | null;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function ConsultantForm({
  open,
  onOpenChange,
  consultant,
  onSuccess,
  onError,
}: ConsultantFormProps) {
  const isEditing = !!consultant?.id;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: consultant
      ? {
          nom: consultant.nom,
          email: consultant.email,
          tjm: consultant.tjm,
          coutJournalierEmployeur: consultant.coutJournalierEmployeur,
          competences: consultant.competences,
          couleur: consultant.couleur ?? "#8B5CF6",
          actif: consultant.actif,
        }
      : { nom: "", email: "", tjm: 0, coutJournalierEmployeur: null, competences: "", couleur: "#8B5CF6", actif: true },
  });

  // Pré-remplir le formulaire quand le dialog s'ouvre
  useEffect(() => {
    if (open && consultant) {
      reset({
        nom: consultant.nom,
        email: consultant.email,
        tjm: consultant.tjm,
        coutJournalierEmployeur: consultant.coutJournalierEmployeur,
        competences: consultant.competences,
        couleur: consultant.couleur ?? "#8B5CF6",
        actif: consultant.actif,
      });
    } else if (open) {
      reset({ nom: "", email: "", tjm: 0, coutJournalierEmployeur: null, competences: "", couleur: "#8B5CF6", actif: true });
    }
  }, [open, consultant, reset]);

  const actifValue = watch("actif");
  const couleurValue = watch("couleur");

  async function onSubmit(values: FormValues) {
    try {
      const url = isEditing
        ? `/api/consultants/${consultant!.id}`
        : "/api/consultants";

      const payload = {
        ...values,
        coutJournalierEmployeur: values.coutJournalierEmployeur || null,
      };

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            {isEditing ? "Modifier le consultant" : "Ajouter un consultant"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du consultant."
              : "Remplissez les informations pour créer un nouveau consultant."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" placeholder="Jean Dupont" {...register("nom")} />
            {errors.nom && (
              <p className="text-xs text-destructive">{errors.nom.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="jean@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tjm">TJM (€) *</Label>
            <Input
              id="tjm"
              type="number"
              min={0}
              placeholder="500"
              {...register("tjm", { valueAsNumber: true })}
            />
            {errors.tjm && (
              <p className="text-xs text-destructive">{errors.tjm.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="coutJournalierEmployeur">
              Coût journalier employeur (€)
            </Label>
            <Input
              id="coutJournalierEmployeur"
              type="number"
              step="0.01"
              min={0}
              placeholder="ex: 275 (salaire chargé ÷ 218j)"
              {...register("coutJournalierEmployeur", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Coût réel/jour pour l&apos;entreprise. Sert au calcul de marge.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {CONSULTANT_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("couleur", color)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: couleurValue === color ? "#000" : "transparent",
                    outline: couleurValue === color ? "2px solid #fff" : "none",
                    outlineOffset: "1px",
                    boxShadow: couleurValue === color ? `0 0 0 2px ${color}` : "none",
                  }}
                  title={color}
                />
              ))}
              <input
                type="color"
                value={couleurValue}
                onChange={(e) => setValue("couleur", e.target.value)}
                className="h-7 w-7 rounded cursor-pointer border border-border"
                title="Couleur personnalisée"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: couleurValue }}
              />
              <span>{couleurValue}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="competences">Compétences</Label>
            <Textarea
              id="competences"
              placeholder="React, TypeScript, Node.js"
              {...register("competences")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="actif"
              checked={actifValue}
              onCheckedChange={(checked) => setValue("actif", checked)}
            />
            <Label htmlFor="actif" className="cursor-pointer">
              Consultant actif
            </Label>
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
