import { describe, it, expect } from "vitest";
import { consultantColor, getPeriodeDates, COLORS } from "@/components/activites/types";

describe("consultantColor", () => {
  it("retourne la couleur fournie si présente", () => {
    expect(consultantColor(0, "#ff0000")).toBe("#ff0000");
  });

  it("retourne une couleur de la palette si pas de couleur fournie", () => {
    const color = consultantColor(0);
    expect(COLORS).toContain(color);
  });

  it("fait un modulo sur l'index pour éviter les débordements", () => {
    expect(consultantColor(0)).toBe(consultantColor(COLORS.length));
  });

  it("retourne des couleurs différentes pour des ids différents", () => {
    expect(consultantColor(0)).not.toBe(consultantColor(1));
  });

  it("ignore la couleur vide string et utilise la palette", () => {
    const color = consultantColor(2, "");
    expect(COLORS).toContain(color);
  });
});

describe("getPeriodeDates", () => {
  it("today retourne dateDebut == dateFin == aujourd'hui", () => {
    const { dateDebut, dateFin } = getPeriodeDates("today");
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const expected = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    expect(dateDebut).toBe(expected);
    expect(dateFin).toBe(expected);
  });

  it("week retourne un lundi et un dimanche", () => {
    const { dateDebut, dateFin } = getPeriodeDates("week");
    expect(dateDebut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateFin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const debut = new Date(dateDebut!);
    const fin = new Date(dateFin!);
    expect(debut.getDay()).toBe(1); // lundi
    expect(fin.getDay()).toBe(0);   // dimanche
  });

  it("week — fin est 6 jours après debut", () => {
    const { dateDebut, dateFin } = getPeriodeDates("week");
    const debut = new Date(dateDebut!);
    const fin = new Date(dateFin!);
    const diff = (fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(6);
  });

  it("month retourne le 1er et le dernier jour du mois courant", () => {
    const { dateDebut, dateFin } = getPeriodeDates("month");
    const debut = new Date(dateDebut!);
    const fin = new Date(dateFin!);
    expect(debut.getDate()).toBe(1);
    // Le lendemain du dernier jour est le 1er du mois suivant
    const nextDay = new Date(fin);
    nextDay.setDate(fin.getDate() + 1);
    expect(nextDay.getDate()).toBe(1);
  });

  it("all retourne un objet vide", () => {
    const result = getPeriodeDates("all");
    expect(result.dateDebut).toBeUndefined();
    expect(result.dateFin).toBeUndefined();
  });

  it("valeur inconnue retourne un objet vide", () => {
    const result = getPeriodeDates("inconnu");
    expect(result).toEqual({});
  });
});
