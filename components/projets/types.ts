// Types partagés pour les composants de la page projet

export interface Etape {
  id: number;
  projetId: number;
  nom: string;
  description: string | null;
  statut: "A_FAIRE" | "EN_COURS" | "VALIDEE";
  deadline: string | null;
  chargeEstimeeJours: number | null;
  ordre: number;
}

export interface Activite {
  id: number;
  date: string;
  heures: string | number;
  description: string | null;
  facturable: boolean;
  consultant: { id: number; nom: string; tjm: string | number };
  etape: { id: number; nom: string } | null;
}

export interface ProjetDetail {
  id: number;
  nom: string;
  client: string;
  budget: string | number;
  chargeEstimeeTotale: number | null;
  dateDebut: string | null;
  dateFin: string | null;
  statut: "PLANIFIE" | "EN_COURS" | "EN_PAUSE" | "TERMINE";
  etapes: Etape[];
  activites: Activite[];
  budgetConsomme: number;
  coutReel: number;
  marge: number;
  totalHeures: number;
}
