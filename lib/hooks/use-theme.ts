"use client";

import { useState, useEffect } from "react";

export type Theme = "light" | "dark";
export type Palette = "default" | "slate";

const THEMES: Theme[] = ["light", "dark"];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [palette, setPaletteState] = useState<Palette>("default");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedPalette = localStorage.getItem("palette") as Palette | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme = savedTheme ?? (prefersDark ? "dark" : "light");
    const initialPalette: Palette = savedPalette ?? "default";
    applyTheme(initialTheme, initialPalette);
    setTheme(initialTheme);
    setPaletteState(initialPalette);
    setHydrated(true);
  }, []);

  function cycle() {
    setTheme((prev) => {
      const next = THEMES[(THEMES.indexOf(prev) + 1) % THEMES.length];
      applyTheme(next, palette);
      localStorage.setItem("theme", next);
      return next;
    });
  }

  function setThemeTo(t: Theme) {
    applyTheme(t, palette);
    localStorage.setItem("theme", t);
    setTheme(t);
  }

  function setPalette(p: Palette) {
    applyTheme(theme, p);
    localStorage.setItem("palette", p);
    setPaletteState(p);
  }

  return { theme, palette, cycle, setTheme: setThemeTo, setPalette, hydrated };
}

function applyTheme(theme: Theme, palette: Palette) {
  const cl = document.documentElement.classList;
  const el = document.documentElement;
  cl.remove("dark", "theme-cerise", "theme-reboot");
  el.removeAttribute("data-palette");
  if (theme === "dark") cl.add("dark");
  if (palette === "slate") el.setAttribute("data-palette", "slate");
}
