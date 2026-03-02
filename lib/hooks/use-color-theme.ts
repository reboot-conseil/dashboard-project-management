"use client";

import { useState, useEffect } from "react";

export type ColorTheme = "classique" | "sobre";

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("classique");

  useEffect(() => {
    const saved = localStorage.getItem("color-theme") as ColorTheme | null;
    const initial: ColorTheme = saved === "sobre" ? "sobre" : "classique";
    applyColorTheme(initial);
    setColorThemeState(initial);
  }, []);

  function setColorTheme(theme: ColorTheme) {
    applyColorTheme(theme);
    localStorage.setItem("color-theme", theme);
    setColorThemeState(theme);
  }

  return { colorTheme, setColorTheme };
}

function applyColorTheme(theme: ColorTheme) {
  document.documentElement.setAttribute("data-color-theme", theme);
}
