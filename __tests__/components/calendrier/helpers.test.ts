import { describe, it, expect } from "vitest";
import {
  statutBadgeVariant,
  healthIcon,
  buildParams,
} from "@/components/calendrier/types";
import type { Filtres } from "@/components/calendrier/types";

const filtresVides: Filtres = {
  projetIds: [],
  consultantIds: [],
  statuts: [],
  urgences: [],
  masquerPassees: false,
};

describe("statutBadgeVariant", () => {
  it("retourne secondary pour VALIDEE", () => {
    expect(statutBadgeVariant("VALIDEE")).toBe("secondary");
  });

  it("retourne default pour EN_COURS", () => {
    expect(statutBadgeVariant("EN_COURS")).toBe("default");
  });

  it("retourne outline pour A_FAIRE", () => {
    expect(statutBadgeVariant("A_FAIRE")).toBe("outline");
  });

  it("retourne outline pour une valeur inconnue", () => {
    expect(statutBadgeVariant("INCONNU")).toBe("outline");
  });
});

describe("healthIcon", () => {
  it("retourne 🔴 pour critical", () => {
    expect(healthIcon("critical")).toBe("🔴");
  });

  it("retourne 🟡 pour attention", () => {
    expect(healthIcon("attention")).toBe("🟡");
  });

  it("retourne 🟢 pour good", () => {
    expect(healthIcon("good")).toBe("🟢");
  });

  it("retourne 🟢 pour une valeur inconnue", () => {
    expect(healthIcon("autre")).toBe("🟢");
  });
});

describe("buildParams", () => {
  it("inclut dateDebut et dateFin", () => {
    const p = buildParams("2026-01-01", "2026-01-31", filtresVides);
    expect(p.get("dateDebut")).toBe("2026-01-01");
    expect(p.get("dateFin")).toBe("2026-01-31");
  });

  it("inclut includePassees=true quand masquerPassees est false", () => {
    const p = buildParams("2026-01-01", "2026-01-31", { ...filtresVides, masquerPassees: false });
    expect(p.get("includePassees")).toBe("true");
  });

  it("inclut includePassees=false quand masquerPassees est true", () => {
    const p = buildParams("2026-01-01", "2026-01-31", { ...filtresVides, masquerPassees: true });
    expect(p.get("includePassees")).toBe("false");
  });

  it("ajoute les projetIds", () => {
    const p = buildParams("2026-01-01", "2026-01-31", { ...filtresVides, projetIds: [1, 2] });
    expect(p.getAll("projetIds[]")).toEqual(["1", "2"]);
  });

  it("ajoute les consultantIds", () => {
    const p = buildParams("2026-01-01", "2026-01-31", { ...filtresVides, consultantIds: [3] });
    expect(p.getAll("consultantIds[]")).toEqual(["3"]);
  });

  it("ajoute les statuts", () => {
    const p = buildParams("2026-01-01", "2026-01-31", { ...filtresVides, statuts: ["A_FAIRE", "EN_COURS"] });
    expect(p.getAll("statuts[]")).toEqual(["A_FAIRE", "EN_COURS"]);
  });

  it("ajoute les urgences", () => {
    const p = buildParams("2026-01-01", "2026-01-31", { ...filtresVides, urgences: ["retard", "critique"] });
    expect(p.getAll("urgences[]")).toEqual(["retard", "critique"]);
  });

  it("n'ajoute pas de projetIds si vide", () => {
    const p = buildParams("2026-01-01", "2026-01-31", filtresVides);
    expect(p.getAll("projetIds[]")).toEqual([]);
  });
});
