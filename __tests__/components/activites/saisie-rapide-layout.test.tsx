import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaisieRapide } from "@/components/activites/saisie-rapide";

const baseProps = {
  consultants: [],
  projets: [],
  etapes: [],
  etapesLoading: false,
  activites: [],
  form: {
    consultantId: "", projetId: "", etapeId: "",
    date: "2026-03-02", heures: "", description: "", facturable: true,
  },
  saving: false,
  heuresRef: { current: null },
  onFormChange: vi.fn(),
  onSave: vi.fn(),
};

describe("SaisieRapide layout", () => {
  it("renders the save button", () => {
    render(<SaisieRapide {...baseProps} />);
    const btn = screen.getByTestId("btn-enregistrer");
    expect(btn).toBeInTheDocument();
  });

  it("save button has min-width class to prevent overflow", () => {
    render(<SaisieRapide {...baseProps} />);
    const btn = screen.getByTestId("btn-enregistrer");
    expect(btn.className).toMatch(/min-w/);
  });

  it("save row spans full column width (col-span-full)", () => {
    render(<SaisieRapide {...baseProps} />);
    const btn = screen.getByTestId("btn-enregistrer");
    const row = btn.closest("[class*='col-span']");
    expect(row).toBeTruthy();
  });
});
