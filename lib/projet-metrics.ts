/**
 * Fonctions de calcul des métriques de progression projet
 * Budget vs Réalisation - Health Score
 */

export interface EtapeMetrics {
  id: number;
  nom: string;
  statut: "A_FAIRE" | "EN_COURS" | "VALIDEE";
  chargeEstimeeJours: number | null;
  heuresReelles: number; // heures saisies sur cette étape
  joursReels: number; // heuresReelles / 8
  ecartJours: number | null; // joursReels - chargeEstimeeJours (null si pas d'estimation)
  performancePct: number | null; // écart en % (null si pas d'estimation)
}

export interface ProgressionMetrics {
  // Pourcentages
  budgetConsommePct: number;
  realisationPct: number;
  methodeRealisation: "charges" | "etapes"; // quelle méthode est utilisée

  // Valeurs brutes
  chargeEstimeeTotale: number; // en jours
  chargeConsommee: number; // en jours (heures activités / 8)
  etapesTotal: number;
  etapesValidees: number;

  // Health Score
  ecart: number; // realisationPct - budgetConsommePct
  health: "bon" | "normal" | "critique";
  healthLabel: string;

  // Vélocité et prédiction
  velocite: number | null; // % réalisation / jours écoulés
  dateFinEstimee: string | null; // ISO date
  joursRestantsEstimes: number | null;
  confiancePrediction: number; // 0-100

  // Historique pour graphique
  historique: { jour: number; budget: number; realisation: number }[];

  // Détail par étape
  etapesDetail: EtapeMetrics[];

  // Alertes
  alertes: { type: string; message: string; recommandation: string }[];
}

interface EtapeInput {
  id: number;
  nom: string;
  statut: "A_FAIRE" | "EN_COURS" | "VALIDEE";
  chargeEstimeeJours: number | null;
}

interface ActiviteInput {
  heures: number;
  date: string; // ISO date
  etapeId: number | null;
}

interface ProjetInput {
  dateDebut: string | null; // ISO date
  dateFin: string | null;
  chargeEstimeeTotale: number | null;
}

/**
 * Calcule toutes les métriques de progression d'un projet
 */
export function calculerProgression(
  projet: ProjetInput,
  etapes: EtapeInput[],
  activites: ActiviteInput[]
): ProgressionMetrics {
  // Defensive: ensure arrays
  etapes = etapes ?? [];
  activites = (activites ?? []).map((a) => ({
    ...a,
    heures: Number(a.heures) || 0,
  }));
  const now = new Date();

  // ── Charge estimée totale ──
  const chargesEtapes = etapes
    .filter((e) => e.chargeEstimeeJours !== null && e.chargeEstimeeJours > 0)
    .map((e) => e.chargeEstimeeJours!);
  const hasChargesEstimees = chargesEtapes.length > 0;
  const chargeEstimeeTotale = hasChargesEstimees
    ? chargesEtapes.reduce((s, v) => s + v, 0)
    : projet.chargeEstimeeTotale ?? 0;

  // ── Charge consommée (heures activités / 8) ──
  const totalHeures = activites.reduce((s, a) => s + a.heures, 0);
  const chargeConsommee = totalHeures / 8;

  // ── % Budget Consommé ──
  const budgetConsommePct =
    chargeEstimeeTotale > 0
      ? Math.round((chargeConsommee / chargeEstimeeTotale) * 1000) / 10
      : 0;

  // ── % Réalisation ──
  let realisationPct = 0;
  let methodeRealisation: "charges" | "etapes" = "etapes";

  if (hasChargesEstimees) {
    // Méthode A : pondérée par charge estimée
    methodeRealisation = "charges";
    const chargeValidee = etapes
      .filter((e) => e.statut === "VALIDEE" && e.chargeEstimeeJours)
      .reduce((s, e) => s + (e.chargeEstimeeJours ?? 0), 0);
    // Ajouter prorata pour étapes EN_COURS
    const chargeEnCours = etapes
      .filter((e) => e.statut === "EN_COURS" && e.chargeEstimeeJours)
      .reduce((s, e) => {
        const heuresEtape = activites
          .filter((a) => a.etapeId === e.id)
          .reduce((h, a) => h + a.heures, 0);
        const joursRealises = heuresEtape / 8;
        const ratio = Math.min(joursRealises / (e.chargeEstimeeJours ?? 1), 0.9); // cap at 90%
        return s + (e.chargeEstimeeJours ?? 0) * ratio;
      }, 0);
    const sommeCharges = chargesEtapes.reduce((s, v) => s + v, 0);
    realisationPct =
      sommeCharges > 0
        ? Math.round(((chargeValidee + chargeEnCours) / sommeCharges) * 1000) / 10
        : 0;
  } else if (etapes.length > 0) {
    // Méthode B : nombre d'étapes
    methodeRealisation = "etapes";
    const validees = etapes.filter((e) => e.statut === "VALIDEE").length;
    realisationPct =
      etapes.length > 0
        ? Math.round((validees / etapes.length) * 1000) / 10
        : 0;
  }

  // ── Écart / Health Score ──
  const ecart = Math.round((realisationPct - budgetConsommePct) * 10) / 10;
  let health: "bon" | "normal" | "critique" = "normal";
  let healthLabel = "On track";
  if (ecart > 0) {
    health = "bon";
    healthLabel = "Avance bien";
  } else if (ecart < -10) {
    health = "critique";
    healthLabel = "Dérive détectée";
  }

  // ── Vélocité et prédiction ──
  let velocite: number | null = null;
  let dateFinEstimee: string | null = null;
  let joursRestantsEstimes: number | null = null;
  let confiancePrediction = 0;

  if (projet.dateDebut && realisationPct > 0) {
    const debut = new Date(projet.dateDebut);
    const joursEcoules = Math.max(
      Math.ceil((now.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)),
      1
    );
    velocite = Math.round((realisationPct / joursEcoules) * 100) / 100;

    if (velocite > 0 && realisationPct < 100) {
      joursRestantsEstimes = Math.ceil((100 - realisationPct) / velocite);
      const fin = new Date(now);
      fin.setDate(fin.getDate() + joursRestantsEstimes);
      dateFinEstimee = fin.toISOString().split("T")[0];

      // Confiance: plus on a de données, plus c'est fiable
      const facteurDonnees = Math.min(activites.length / 10, 1) * 40;
      const facteurProgression = Math.min(realisationPct / 30, 1) * 30;
      const facteurCharges = hasChargesEstimees ? 30 : 15;
      confiancePrediction = Math.round(facteurDonnees + facteurProgression + facteurCharges);
    }
  }

  // ── Historique pour graphique ──
  const historique = calculerHistorique(
    projet,
    etapes,
    activites,
    chargeEstimeeTotale
  );

  // ── Détail par étape ──
  const etapesDetail: EtapeMetrics[] = etapes.map((e) => {
    const heuresReelles = activites
      .filter((a) => a.etapeId === e.id)
      .reduce((s, a) => s + a.heures, 0);
    const joursReels = heuresReelles / 8;
    const ecartJours =
      e.chargeEstimeeJours !== null ? Math.round((joursReels - e.chargeEstimeeJours) * 10) / 10 : null;
    const performancePct =
      e.chargeEstimeeJours !== null && e.chargeEstimeeJours > 0
        ? Math.round(((joursReels - e.chargeEstimeeJours) / e.chargeEstimeeJours) * 1000) / 10
        : null;

    return {
      id: e.id,
      nom: e.nom,
      statut: e.statut,
      chargeEstimeeJours: e.chargeEstimeeJours,
      heuresReelles,
      joursReels: Math.round(joursReels * 10) / 10,
      ecartJours,
      performancePct,
    };
  });

  // ── Alertes intelligentes ──
  const alertes: { type: string; message: string; recommandation: string }[] = [];

  if (ecart < -15) {
    alertes.push({
      type: "critique",
      message: `Le projet consomme ${Math.abs(ecart).toFixed(0)}% plus de budget que la progression ne le justifie`,
      recommandation: "Revoir le scope avec le client, augmenter le budget, ou accepter une livraison partielle",
    });
  } else if (ecart < -10) {
    alertes.push({
      type: "warning",
      message: `Écart de ${Math.abs(ecart).toFixed(0)}% entre budget et réalisation`,
      recommandation: "Surveillance requise — analyser les causes du retard",
    });
  }

  if (budgetConsommePct > 90 && realisationPct < 70) {
    alertes.push({
      type: "critique",
      message: `Budget à ${budgetConsommePct.toFixed(0)}% mais seulement ${realisationPct.toFixed(0)}% réalisé`,
      recommandation: "Risque de dépassement imminent — action urgente requise",
    });
  }

  // Étapes en dépassement
  const etapesEnDepassement = etapesDetail.filter(
    (e) => e.statut === "VALIDEE" && e.performancePct !== null && e.performancePct > 20
  );
  if (etapesEnDepassement.length > 0) {
    alertes.push({
      type: "warning",
      message: `${etapesEnDepassement.length} étape(s) ont dépassé leur estimation de plus de 20%`,
      recommandation: "Ajuster les estimations des étapes restantes en conséquence",
    });
  }

  return {
    budgetConsommePct,
    realisationPct,
    methodeRealisation,
    chargeEstimeeTotale,
    chargeConsommee: Math.round(chargeConsommee * 10) / 10,
    etapesTotal: etapes.length,
    etapesValidees: etapes.filter((e) => e.statut === "VALIDEE").length,
    ecart,
    health,
    healthLabel,
    velocite,
    dateFinEstimee,
    joursRestantsEstimes,
    confiancePrediction,
    historique,
    etapesDetail,
    alertes,
  };
}

/**
 * Calcule l'historique jour par jour pour le graphique
 */
function calculerHistorique(
  projet: ProjetInput,
  etapes: EtapeInput[],
  activites: ActiviteInput[],
  chargeEstimeeTotale: number
): { jour: number; budget: number; realisation: number }[] {
  if (!projet.dateDebut || activites.length === 0 || chargeEstimeeTotale === 0) {
    return [];
  }

  const debut = new Date(projet.dateDebut);
  const now = new Date();
  const totalJours = Math.ceil((now.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24));

  if (totalJours <= 0) return [];

  // Trier activités par date
  const activitesTriees = [...activites].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculer cumul par jour
  const points: { jour: number; budget: number; realisation: number }[] = [];
  let cumulHeures = 0;

  // Sampling : max 30 points pour le graphique
  const step = Math.max(1, Math.floor(totalJours / 30));

  for (let j = 0; j <= totalJours; j += step) {
    const dateJour = new Date(debut);
    dateJour.setDate(dateJour.getDate() + j);
    const dateStr = dateJour.toISOString().split("T")[0];

    // Cumuler heures jusqu'à ce jour
    cumulHeures = activitesTriees
      .filter((a) => a.date.split("T")[0] <= dateStr)
      .reduce((s, a) => s + a.heures, 0);

    const budgetPct =
      chargeEstimeeTotale > 0
        ? Math.round((cumulHeures / 8 / chargeEstimeeTotale) * 1000) / 10
        : 0;

    // Réalisation : based on étapes validées avant cette date
    // Simplification: on utilise le prorata budget comme proxy si pas mieux
    // Pour une v2, il faudrait tracker les dates de validation des étapes
    const denominator = Math.max(cumulHeures / 8, 0.1);
    const ratio = chargeEstimeeTotale > 0 ? Math.min(1, chargeEstimeeTotale / denominator) : 1;
    const realisationPct = isFinite(ratio) ? budgetPct * ratio : budgetPct;

    points.push({
      jour: j,
      budget: Math.round(budgetPct * 10) / 10,
      realisation: Math.round(realisationPct * 10) / 10,
    });
  }

  // Ajouter le point actuel
  const dernierJour = totalJours;
  if (points.length === 0 || points[points.length - 1].jour !== dernierJour) {
    cumulHeures = activitesTriees.reduce((s, a) => s + a.heures, 0);
    const budgetPct =
      chargeEstimeeTotale > 0
        ? Math.round((cumulHeures / 8 / chargeEstimeeTotale) * 1000) / 10
        : 0;

    // Recalculer réalisation avec méthode étapes
    const hasCharges = etapes.some((e) => e.chargeEstimeeJours && e.chargeEstimeeJours > 0);
    let realPct = 0;
    if (hasCharges) {
      const chargeValidee = etapes
        .filter((e) => e.statut === "VALIDEE" && e.chargeEstimeeJours)
        .reduce((s, e) => s + (e.chargeEstimeeJours ?? 0), 0);
      const totalCharges = etapes
        .filter((e) => e.chargeEstimeeJours)
        .reduce((s, e) => s + (e.chargeEstimeeJours ?? 0), 0);
      realPct = totalCharges > 0 ? Math.round((chargeValidee / totalCharges) * 1000) / 10 : 0;
    } else if (etapes.length > 0) {
      const validees = etapes.filter((e) => e.statut === "VALIDEE").length;
      realPct = Math.round((validees / etapes.length) * 1000) / 10;
    }

    points.push({
      jour: dernierJour,
      budget: budgetPct,
      realisation: realPct,
    });
  }

  return points;
}
