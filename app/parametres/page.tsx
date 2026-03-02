"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Settings } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useColorTheme, type ColorTheme } from "@/lib/hooks/use-color-theme";
import { useTheme } from "@/lib/hooks/use-theme";
import { cn } from "@/lib/utils";
import { GLOBAL_SHORTCUTS } from "@/lib/shortcuts";

const COLOR_THEMES: { value: ColorTheme; label: string; description: string; preview: string[] }[] = [
  {
    value: "classique",
    label: "Classique",
    description: "Bleu vif, couleurs saturées — thème par défaut",
    preview: ["#1d4ed8", "#3b82f6", "#8B5CF6", "#EC4899", "#10B981"],
  },
  {
    value: "sobre",
    label: "Sobre & Classe",
    description: "Bleu ardoise, tons neutres et élégants",
    preview: ["#475569", "#94a3b8", "#6d5ea8", "#3d7a5c", "#8a6b30"],
  },
];

export default function ParametresPage() {
  const { colorTheme, setColorTheme, hydrated: colorHydrated } = useColorTheme();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-3xl mx-auto">
      <PageHeader
        title="Paramètres"
        subtitle="Personnalisez votre expérience"
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="space-y-6 mt-6">
        {/* Apparence */}
        <Card>
          <CardHeader>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>Choisissez votre thème visuel et mode d&apos;affichage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode clair / sombre */}
            <div role="group" aria-labelledby="mode-label">
              <p id="mode-label" className="text-sm font-medium mb-3">Mode</p>
              <div className="flex gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => theme === "dark" && toggle()}
                >
                  Clair
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => theme === "light" && toggle()}
                >
                  Sombre
                </Button>
              </div>
            </div>

            {/* Palette de couleurs */}
            <div>
              <p className="text-sm font-medium mb-3">Palette de couleurs</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COLOR_THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setColorTheme(t.value)}
                    aria-pressed={colorHydrated ? colorTheme === t.value : undefined}
                    disabled={!colorHydrated}
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-lg border text-left transition-all",
                      colorTheme === t.value
                        ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex gap-1.5">
                      {t.preview.map((c) => (
                        <span
                          key={c}
                          className="h-5 w-5 rounded-full"
                          style={{ backgroundColor: c }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Raccourcis clavier */}
        <Card>
          <CardHeader>
            <CardTitle>Raccourcis clavier</CardTitle>
            <CardDescription>Utilisez le bouton <kbd className="px-1.5 py-0.5 rounded border text-xs font-mono">?</kbd> sur chaque page pour afficher les raccourcis disponibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {GLOBAL_SHORTCUTS.map(({ keys, action }) => (
                <div key={keys} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{action}</span>
                  <kbd className="px-2 py-0.5 rounded border bg-muted text-xs font-mono">{keys}</kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
