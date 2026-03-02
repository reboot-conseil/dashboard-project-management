// Types, constantes et helpers partagés pour le calendrier

export interface ConsultantInfo {
  id: number;
  nom: string;
  couleur: string;
  tjm?: number | null;
}

export interface ProjetInfo {
  id: number;
  nom: string;
  couleur: string;
}

export interface EtapeInfo {
  id: number;
  nom: string;
  description: string | null;
  statut: "A_FAIRE" | "EN_COURS" | "VALIDEE";
  dateDebut: string | null;
  deadline: string | null;
  chargeEstimeeJours: number | null;
  ordre: number;
  projet: ProjetInfo;
  consultants: ConsultantInfo[];
  tempsPasseJours: number;
  health: "good" | "attention" | "critical";
  urgence: "retard" | "critique" | "proche" | "normal";
  joursRestants: number | null;
}

export interface CalActivite {
  id: number;
  date: string;
  heures: number;
  consultant: ConsultantInfo;
  projet: ProjetInfo;
  etape: { id: number; nom: string } | null;
  description: string | null;
  facturable: boolean;
}

export interface CalData {
  activites: CalActivite[];
  deadlines: {
    id: number;
    date: string | null;
    etape: { nom: string; statut: string };
    projet: ProjetInfo;
    joursRestants: number | null;
  }[];
  heuresParJour: Record<string, number>;
  etapes: EtapeInfo[];
  consultants: ConsultantInfo[];
  projets: ProjetInfo[];
  chargePlanifiee: Record<number, Record<string, number>>;
  stats: {
    totalEtapes: number;
    enRetard: number;
    critiques: number;
    surcharges: number;
    capaciteDisponible: number;
  };
}

export interface Filtres {
  projetIds: number[];
  consultantIds: number[];
  statuts: string[];
  urgences: string[];
  masquerPassees: boolean;
}

export type VueType = "mois" | "gantt" | "charge";

export const STATUT_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  VALIDEE: "Validée",
};

export const URGENCE_LABELS: Record<string, string> = {
  retard: "En retard",
  critique: "Critique (< 3j)",
  proche: "Proche (< 7j)",
  normal: "Normal",
};

export function statutBadgeVariant(
  statut: string
): "destructive" | "default" | "secondary" | "outline" {
  if (statut === "VALIDEE") return "secondary";
  if (statut === "EN_COURS") return "default";
  return "outline";
}

export function healthIcon(health: string): string {
  if (health === "critical") return "🔴";
  if (health === "attention") return "🟡";
  return "🟢";
}


export function buildParams(
  dateDebut: string,
  dateFin: string,
  filtres: Filtres
): URLSearchParams {
  const p = new URLSearchParams({ dateDebut, dateFin });
  filtres.projetIds.forEach((id) => p.append("projetIds[]", String(id)));
  filtres.consultantIds.forEach((id) => p.append("consultantIds[]", String(id)));
  filtres.statuts.forEach((s) => p.append("statuts[]", s));
  filtres.urgences.forEach((u) => p.append("urgences[]", u));
  if (filtres.masquerPassees) p.set("includePassees", "false");
  else p.set("includePassees", "true");
  return p;
}
