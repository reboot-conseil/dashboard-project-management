export interface Shortcut {
  keys: string;
  action: string;
}

export const SHORTCUTS_BY_PAGE: Record<string, Shortcut[]> = {
  "/": [
    { keys: "Ctrl+1", action: "Vue Opérationnelle" },
    { keys: "Ctrl+2", action: "Vue Consultants" },
    { keys: "Ctrl+3", action: "Vue Stratégique" },
  ],
  "/activites": [
    { keys: "Ctrl+S", action: "Enregistrer l'activité" },
    { keys: "Ctrl+F", action: "Focus sur la recherche" },
  ],
  "/projets": [
    { keys: "N", action: "Nouveau projet" },
  ],
  "/calendrier": [
    { keys: "←/→", action: "Mois précédent / suivant" },
    { keys: "1/2/3", action: "Vue Mois / Gantt / Charge Équipe" },
  ],
};

export const GLOBAL_SHORTCUTS: Shortcut[] = [
  { keys: "Ctrl+1/2/3", action: "Changer de vue Dashboard" },
  { keys: "?", action: "Afficher les raccourcis" },
  { keys: "Échap", action: "Fermer les modales" },
];
