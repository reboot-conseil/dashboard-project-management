"use client";

import { useState, useEffect } from "react";

export type ColorTheme = "classique" | "sobre";

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("classique");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("color-theme") as ColorTheme | null;
    const initial: ColorTheme = saved === "sobre" ? "sobre" : "classique";
    applyColorTheme(initial);
    setColorThemeState(initial);
    setHydrated(true);
  }, []);

  function setColorTheme(theme: ColorTheme) {
    applyColorTheme(theme);
    localStorage.setItem("color-theme", theme);
    setColorThemeState(theme);
  }

  return { colorTheme, setColorTheme, hydrated };
}

function applyColorTheme(theme: ColorTheme) {
  document.documentElement.setAttribute("data-color-theme", theme);
}
