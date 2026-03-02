"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface AlerteMin {
  id: string;
  titre: string;
  description: string;
  projetNom: string;
  severite: "critique" | "attention" | "info";
}

export function AlertToaster({ alertes }: { alertes: AlerteMin[] }) {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || alertes.length === 0) return;
    shown.current = true;

    // Small delay so the page renders first
    const timer = setTimeout(() => {
      if (alertes.length === 1) {
        const a = alertes[0];
        toast.error(`${a.titre} — ${a.projetNom}`, {
          description: a.description,
          duration: 6000,
        });
      } else {
        toast.error(`${alertes.length} alertes critiques`, {
          description: alertes.map((a) => `${a.projetNom}: ${a.titre}`).join(" | "),
          duration: 8000,
        });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [alertes]);

  return null;
}
