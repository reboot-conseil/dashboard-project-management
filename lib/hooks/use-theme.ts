"use client";

import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

const THEMES: Theme[] = ["light", "dark"];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = saved ?? (prefersDark ? "dark" : "light");
    applyTheme(initial);
    setTheme(initial);
    setHydrated(true);
  }, []);

  function cycle() {
    setTheme((prev) => {
      const next = THEMES[(THEMES.indexOf(prev) + 1) % THEMES.length];
      applyTheme(next);
      localStorage.setItem("theme", next);
      return next;
    });
  }

  function setThemeTo(t: Theme) {
    applyTheme(t);
    localStorage.setItem("theme", t);
    setTheme(t);
  }

  return { theme, cycle, setTheme: setThemeTo, hydrated };
}

function applyTheme(theme: Theme) {
  const cl = document.documentElement.classList;
  cl.remove("dark", "theme-cerise", "theme-reboot");
  if (theme === "dark")   cl.add("dark");
  if (theme === "cerise") cl.add("theme-cerise");
  if (theme === "reboot") cl.add("theme-reboot");
}
