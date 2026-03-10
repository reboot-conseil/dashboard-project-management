import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EtapeSidebar } from "@/components/calendrier/etape-sidebar";
import type { EtapeInfo } from "@/components/calendrier/types";

const makeEtape = (overrides: Partial<EtapeInfo> = {}): EtapeInfo => ({
  id: 1,
  nom: "Développement API",
  description: "Implémentation des endpoints REST",
  statut: "A_FAIRE",
  dateDebut: "2026-03-01",
  deadline: "2026-03-31",
  chargeEstimeeJours: 5,
  ordre: 1,
  projet: { id: 10, nom: "Projet Alpha", couleur: "#3b82f6" },
  consultants: [{ id: 1, nom: "Alice Dupont", couleur: "#8B5CF6" }],
  tempsPasseJours: 1,
  health: "good",
  urgence: "normal",
  joursRestants: 29,
  ...overrides,
});

const defaultCallbacks = {
  onClose: vi.fn(),
  onChangerStatut: vi.fn(),
  onReporterDeadline: vi.fn(),
  onSupprimer: vi.fn(),
  onNavigate: vi.fn(),
  onLogHeures: vi.fn(),
};

function renderSidebar(etape: EtapeInfo = makeEtape(), callbacks = defaultCallbacks) {
  return render(<EtapeSidebar etape={etape} {...callbacks} />);
}

describe("EtapeSidebar", () => {
  it("affiche le data-testid etape-sidebar", () => {
    renderSidebar();
    expect(screen.getByTestId("etape-sidebar")).toBeInTheDocument();
  });

  it("affiche le nom de l'etape", () => {
    renderSidebar();
    expect(screen.getByText("Développement API")).toBeInTheDocument();
  });

  it("affiche le nom du projet", () => {
    renderSidebar();
    expect(screen.getByText("Projet Alpha")).toBeInTheDocument();
  });

  it("affiche le label du statut A_FAIRE", () => {
    renderSidebar();
    expect(screen.getByText("À faire")).toBeInTheDocument();
  });

  it("affiche le label du statut EN_COURS", () => {
    renderSidebar(makeEtape({ statut: "EN_COURS" }));
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("affiche le label du statut VALIDEE", () => {
    renderSidebar(makeEtape({ statut: "VALIDEE" }));
    expect(screen.getByText("Validée")).toBeInTheDocument();
  });

  it("appelle onClose au clic sur le bouton fermer", () => {
    const onClose = vi.fn();
    renderSidebar(makeEtape(), { ...defaultCallbacks, onClose });
    fireEvent.click(screen.getByTestId("sidebar-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("affiche le bouton Démarrer pour A_FAIRE", () => {
    renderSidebar(makeEtape({ statut: "A_FAIRE" }));
    expect(screen.getByText("Démarrer")).toBeInTheDocument();
  });

  it("appelle onChangerStatut(EN_COURS) au clic sur Démarrer", () => {
    const onChangerStatut = vi.fn();
    renderSidebar(makeEtape({ statut: "A_FAIRE" }), { ...defaultCallbacks, onChangerStatut });
    fireEvent.click(screen.getByText("Démarrer"));
    expect(onChangerStatut).toHaveBeenCalledWith("EN_COURS");
  });

  it("affiche le bouton Valider pour EN_COURS", () => {
    renderSidebar(makeEtape({ statut: "EN_COURS" }));
    expect(screen.getByText("Valider")).toBeInTheDocument();
  });

  it("appelle onChangerStatut(VALIDEE) au clic sur Valider", () => {
    const onChangerStatut = vi.fn();
    renderSidebar(makeEtape({ statut: "EN_COURS" }), { ...defaultCallbacks, onChangerStatut });
    fireEvent.click(screen.getByText("Valider"));
    expect(onChangerStatut).toHaveBeenCalledWith("VALIDEE");
  });

  it("affiche le bouton Réouvrir pour VALIDEE", () => {
    renderSidebar(makeEtape({ statut: "VALIDEE" }));
    expect(screen.getByText("Réouvrir")).toBeInTheDocument();
  });

  it("appelle onChangerStatut(EN_COURS) au clic sur Réouvrir", () => {
    const onChangerStatut = vi.fn();
    renderSidebar(makeEtape({ statut: "VALIDEE" }), { ...defaultCallbacks, onChangerStatut });
    fireEvent.click(screen.getByText("Réouvrir"));
    expect(onChangerStatut).toHaveBeenCalledWith("EN_COURS");
  });

  it("appelle onNavigate avec l'id du projet au clic sur Voir projet", () => {
    const onNavigate = vi.fn();
    renderSidebar(makeEtape(), { ...defaultCallbacks, onNavigate });
    fireEvent.click(screen.getByText("Voir projet"));
    expect(onNavigate).toHaveBeenCalledWith(10);
  });

  it("appelle onSupprimer au clic sur Supprimer", () => {
    const onSupprimer = vi.fn();
    renderSidebar(makeEtape(), { ...defaultCallbacks, onSupprimer });
    fireEvent.click(screen.getByText(/Supprimer/));
    expect(onSupprimer).toHaveBeenCalledTimes(1);
  });

  it("le bouton Reporter est disabled si deadline inchangee", () => {
    renderSidebar(makeEtape({ deadline: "2026-03-31" }));
    const btn = screen.getByText("Reporter").closest("button");
    expect(btn).toBeDisabled();
  });

  it("le bouton Reporter est disabled si pas de deadline", () => {
    renderSidebar(makeEtape({ deadline: null }));
    const btn = screen.getByText("Reporter").closest("button");
    expect(btn).toBeDisabled();
  });

  it("appelle onReporterDeadline apres changement de date", () => {
    const onReporterDeadline = vi.fn();
    renderSidebar(makeEtape({ deadline: "2026-03-31" }), { ...defaultCallbacks, onReporterDeadline });
    const input = screen.getByDisplayValue("2026-03-31");
    fireEvent.change(input, { target: { value: "2026-04-15" } });
    fireEvent.click(screen.getByText("Reporter"));
    expect(onReporterDeadline).toHaveBeenCalledWith("2026-04-15");
  });

  it("affiche le nom du consultant", () => {
    renderSidebar();
    expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
  });

  it("affiche la description", () => {
    renderSidebar();
    expect(screen.getByText("Implémentation des endpoints REST")).toBeInTheDocument();
  });
});
