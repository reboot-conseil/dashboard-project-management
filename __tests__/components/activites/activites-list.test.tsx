import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivitesList } from "@/components/activites/activites-list";
import type { Activite, Totaux, SavedFilter } from "@/components/activites/types";

const totauxVides: Totaux = { total: 0, facturable: 0, nonFacturable: 0 };

const makeActivite = (id: number): Activite => ({
  id,
  date: "2026-03-01",
  heures: 7.5,
  description: `Description ${id}`,
  facturable: true,
  consultant: { id: 1, nom: "Alice Dupont", couleur: "#8B5CF6" },
  projet: { id: 10, nom: "Projet Alpha" },
  etape: null,
});

const defaultProps = {
  activites: [],
  totaux: totauxVides,
  loading: false,
  consultants: [{ id: 1, nom: "Alice Dupont" }],
  projets: [{ id: 10, nom: "Projet Alpha" }],
  filtreConsultant: "",
  filtreProjet: "",
  filtrePeriode: "month",
  filtreFacturable: "",
  savedFilters: [],
  savedFiltersOpen: false,
  onFiltreConsultant: vi.fn(),
  onFiltreProjet: vi.fn(),
  onFiltrePeriode: vi.fn(),
  onFiltreFacturable: vi.fn(),
  onToggleSavedFilters: vi.fn(),
  onOpenSaveFilterDialog: vi.fn(),
  onApplyFilter: vi.fn(),
  onDeleteFilter: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe("ActivitesList", () => {
  it("affiche le data-testid activites-list", () => {
    render(<ActivitesList {...defaultProps} />);
    expect(screen.getByTestId("activites-list")).toBeInTheDocument();
  });

  it("affiche le message chargement", () => {
    render(<ActivitesList {...defaultProps} loading={true} />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("affiche le message vide si pas d'activites", () => {
    render(<ActivitesList {...defaultProps} activites={[]} />);
    expect(screen.getByTestId("empty")).toBeInTheDocument();
  });

  it("affiche la table si des activites existent", () => {
    render(<ActivitesList {...defaultProps} activites={[makeActivite(1)]} totaux={{ total: 7.5, facturable: 7.5, nonFacturable: 0 }} />);
    expect(screen.getByTestId("activites-table")).toBeInTheDocument();
  });

  it("affiche une ligne par activite", () => {
    render(<ActivitesList {...defaultProps} activites={[makeActivite(1), makeActivite(2)]} totaux={{ total: 15, facturable: 15, nonFacturable: 0 }} />);
    expect(screen.getByTestId("row-1")).toBeInTheDocument();
    expect(screen.getByTestId("row-2")).toBeInTheDocument();
  });

  it("affiche le nom du consultant dans la table", () => {
    render(<ActivitesList {...defaultProps} activites={[makeActivite(1)]} totaux={{ total: 7.5, facturable: 7.5, nonFacturable: 0 }} />);
    const row = screen.getByTestId("row-1");
    expect(row).toHaveTextContent("Alice Dupont");
  });

  it("affiche les totaux", () => {
    render(<ActivitesList {...defaultProps} activites={[makeActivite(1)]} totaux={{ total: 7.5, facturable: 7.5, nonFacturable: 0 }} />);
    expect(screen.getByTestId("totaux")).toBeInTheDocument();
    expect(screen.getByTestId("total-heures")).toHaveTextContent("7.5h");
  });

  it("appelle onEdit au clic sur le bouton modifier", () => {
    const onEdit = vi.fn();
    render(<ActivitesList {...defaultProps} activites={[makeActivite(5)]} totaux={{ total: 7.5, facturable: 7.5, nonFacturable: 0 }} onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId("btn-edit-5"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("appelle onDelete au clic sur le bouton supprimer", () => {
    const onDelete = vi.fn();
    render(<ActivitesList {...defaultProps} activites={[makeActivite(5)]} totaux={{ total: 7.5, facturable: 7.5, nonFacturable: 0 }} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId("btn-delete-5"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("affiche le bouton sauvegarder filtre", () => {
    render(<ActivitesList {...defaultProps} />);
    expect(screen.getByTestId("btn-save-filter")).toBeInTheDocument();
  });

  it("appelle onOpenSaveFilterDialog au clic sur sauvegarder filtre", () => {
    const onOpenSaveFilterDialog = vi.fn();
    render(<ActivitesList {...defaultProps} onOpenSaveFilterDialog={onOpenSaveFilterDialog} />);
    fireEvent.click(screen.getByTestId("btn-save-filter"));
    expect(onOpenSaveFilterDialog).toHaveBeenCalledTimes(1);
  });

  it("affiche le bouton filtres sauvegardés si savedFilters non vide", () => {
    const filter: SavedFilter = { id: "1", nom: "Mon filtre", consultantId: "", projetId: "", periode: "month", facturable: "" };
    render(<ActivitesList {...defaultProps} savedFilters={[filter]} />);
    expect(screen.getByTestId("btn-saved-filters")).toBeInTheDocument();
  });

  it("affiche le total count correctement", () => {
    render(<ActivitesList {...defaultProps} activites={[makeActivite(1), makeActivite(2)]} totaux={{ total: 15, facturable: 15, nonFacturable: 0 }} />);
    expect(screen.getByTestId("total-count")).toHaveTextContent("2 activités");
  });
});
