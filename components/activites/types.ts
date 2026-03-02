// Types, constantes et helpers partagés pour le module Activités

export interface Consultant {
  id: number;
  nom: string;
  couleur?: string;
}

export interface Projet {
  id: number;
  nom: string;
  couleur?: string;
}

export interface Etape {
  id: number;
  nom: string;
  statut: "A_FAIRE" | "EN_COURS" | "VALIDEE";
  chargeEstimeeJours?: number | null;
}

export interface Activite {
  id: number;
  date: string;
  heures: string | number;
  description: string | null;
  facturable: boolean;
  consultant: { id: number; nom: string; couleur?: string };
  projet: { id: number; nom: string; couleur?: string };
  etape: { id: number; nom: string } | null;
}

export interface Totaux {
  total: number;
  facturable: number;
  nonFacturable: number;
}

export interface SavedFilter {
  id: string;
  nom: string;
  consultantId: string;
  projetId: string;
  periode: string;
  facturable: string;
}

export interface EditForm {
  consultantId: string;
  projetId: string;
  etapeId: string;
  date: string;
  heures: string;
  description: string;
  facturable: boolean;
}

export const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316"];

export function consultantColor(id: number, couleur?: string): string {
  if (couleur) return couleur;
  return COLORS[id % COLORS.length];
}

export const PERIODES = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "all", label: "Toutes" },
] as const;

export type PeriodeValue = typeof PERIODES[number]["value"];

export function getPeriodeDates(periode: string): { dateDebut?: string; dateFin?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (periode) {
    case "today":
      return { dateDebut: fmt(now), dateFin: fmt(now) };
    case "week": {
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { dateDebut: fmt(monday), dateFin: fmt(sunday) };
    }
    case "month": {
      const debut = new Date(now.getFullYear(), now.getMonth(), 1);
      const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { dateDebut: fmt(debut), dateFin: fmt(fin) };
    }
    default:
      return {};
  }
}
