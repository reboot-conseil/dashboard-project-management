"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export function SplashScreen() {
  const { data: session, status } = useSession();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    // Clé unique par session navigateur (tab)
    const key = "session-welcomed-v2";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    setVisible(true);
    const fadeTimer = setTimeout(() => setFading(true), 2200);
    const hideTimer = setTimeout(() => setVisible(false), 2800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [status]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-[600ms] ease-out pointer-events-none",
        fading ? "opacity-0" : "opacity-100"
      )}
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)" }}
      aria-live="polite"
      aria-label="Bienvenue"
    >
      <div className="text-center select-none">
        <h1 className="text-[3.25rem] font-bold text-white tracking-tight leading-none mb-3">
          Bonjour{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-white/60 text-[1rem] capitalize tracking-wide">{today}</p>
      </div>
    </div>
  );
}
