"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Settings, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme, type Palette } from "@/lib/hooks/use-theme";
import { cn } from "@/lib/utils";
import { GLOBAL_SHORTCUTS } from "@/lib/shortcuts";
import { useSession } from "next-auth/react";
import Link from "next/link";

const UI_THEMES: { value: Theme; label: string; description: string; preview: string[] }[] = [
  {
    value: "light",
    label: "Clair",
    description: "Interface lumineuse, fond blanc",
    preview: ["#2563eb", "#F8FAFC", "#E2E8F0"],
  },
  {
    value: "dark",
    label: "Sombre",
    description: "Interface sombre, confort nocturne",
    preview: ["#60A5FA", "#0D1117", "#30363D"],
  },
];

const UI_PALETTES: { value: Palette; label: string; description: string; preview: string[] }[] = [
  {
    value: "default",
    label: "Professional Blue",
    description: "Bleu primaire, surfaces froides — par défaut",
    preview: ["#2563EB", "#059669", "#D97706", "#DC2626"],
  },
  {
    value: "slate",
    label: "Slate Neutral",
    description: "Gris-ardoise sobre, accent bleu sur les CTAs",
    preview: ["#475569", "#15803D", "#B45309", "#B91C1C"],
  },
];

export default function ParametresPage() {
  const { theme, palette, setTheme: setUiTheme, setPalette, hydrated: themeHydrated } = useTheme();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

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
              <p id="mode-label" className="text-sm font-medium mb-3">Mode d&apos;affichage</p>
              <div className="grid grid-cols-2 gap-3">
                {UI_THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setUiTheme(t.value)}
                    aria-pressed={themeHydrated ? theme === t.value : undefined}
                    disabled={!themeHydrated}
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-lg border text-left transition-all",
                      theme === t.value
                        ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex gap-1.5">
                      {t.preview.map((c) => (
                        <span
                          key={c}
                          className="h-5 w-5 rounded-full border border-black/10"
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

            {/* Palette de couleurs */}
            <div role="group" aria-labelledby="palette-label">
              <p id="palette-label" className="text-sm font-medium mb-1">Palette de couleurs</p>
              <p className="text-xs text-muted-foreground mb-3">S&apos;applique dans les deux modes</p>
              <div className="grid grid-cols-2 gap-3">
                {UI_PALETTES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPalette(p.value)}
                    aria-pressed={themeHydrated ? palette === p.value : undefined}
                    disabled={!themeHydrated}
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-lg border text-left transition-all",
                      palette === p.value
                        ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex gap-1.5 items-center">
                      {p.preview.map((c) => (
                        <span
                          key={c}
                          className="h-4 w-4 rounded border border-black/10"
                          style={{ backgroundColor: c, borderRadius: "3px" }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Intégrations — admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Intégrations</CardTitle>
              <CardDescription>Connectez des outils externes à votre dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/crakotte" className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">API Crakotte</p>
                    <p className="text-xs text-muted-foreground">Synchronisation automatique des temps saisis</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">→</span>
              </Link>
            </CardContent>
          </Card>
        )}

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
