"use client";

import { useEffect } from "react";
import { BarChart3, Users, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardConsultants } from "@/components/dashboard/DashboardConsultants";
import { DashboardOperationnel } from "@/components/dashboard/DashboardOperationnel";
import { DashboardStrategique } from "@/components/dashboard/DashboardStrategique";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────
type VueDashboard = "operationnel" | "consultants" | "strategique";

const VALID_VUES: readonly VueDashboard[] = ["operationnel", "consultants", "strategique"];

// ── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [storedVue, setVue] = useLocalStorage<string>("dashboard-active-view", "operationnel");

  const vue: VueDashboard = VALID_VUES.includes(storedVue as VueDashboard)
    ? (storedVue as VueDashboard)
    : "operationnel";

  // Keyboard shortcuts: Ctrl+1, Ctrl+2, Ctrl+3
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      switch (e.key) {
        case "1": e.preventDefault(); setVue("operationnel"); break;
        case "2": e.preventDefault(); setVue("consultants"); break;
        case "3": e.preventDefault(); setVue("strategique"); break;
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setVue]);

  return (
    <Tabs value={vue} onValueChange={setVue}>
      <div className="p-7 md:px-9 md:pt-7">

        {/* ── Onglets vue en underline ────────────────────────── */}
        <TabsList className="bg-transparent border-b border-[var(--color-border)] rounded-none h-auto p-0 w-full justify-start gap-0 mb-0">
          <TabsTrigger
            value="operationnel"
            title="Vue Opérationnelle (Ctrl+1)"
            className="rounded-none border-b-2 border-transparent -mb-px px-4 py-2 text-[13px] font-medium bg-transparent text-[var(--color-muted-foreground)] data-[state=active]:border-[var(--color-primary)] data-[state=active]:text-[var(--color-primary)] data-[state=active]:font-semibold data-[state=active]:bg-transparent gap-1.5"
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />Opérationnel
          </TabsTrigger>
          <TabsTrigger
            value="consultants"
            title="Vue Consultants (Ctrl+2)"
            className="rounded-none border-b-2 border-transparent -mb-px px-4 py-2 text-[13px] font-medium bg-transparent text-[var(--color-muted-foreground)] data-[state=active]:border-[var(--color-primary)] data-[state=active]:text-[var(--color-primary)] data-[state=active]:font-semibold data-[state=active]:bg-transparent gap-1.5"
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />Consultants
          </TabsTrigger>
          <TabsTrigger
            value="strategique"
            title="Vue Stratégique (Ctrl+3)"
            className="rounded-none border-b-2 border-transparent -mb-px px-4 py-2 text-[13px] font-medium bg-transparent text-[var(--color-muted-foreground)] data-[state=active]:border-[var(--color-primary)] data-[state=active]:text-[var(--color-primary)] data-[state=active]:font-semibold data-[state=active]:bg-transparent gap-1.5"
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />Stratégique
          </TabsTrigger>
        </TabsList>

      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="px-7 md:px-9 pb-9 pt-6">
        <TabsContent value="operationnel" className="mt-0"><DashboardOperationnel /></TabsContent>
        <TabsContent value="consultants"  className="mt-0"><DashboardConsultants /></TabsContent>
        <TabsContent value="strategique"  className="mt-0"><DashboardStrategique /></TabsContent>
      </div>
    </Tabs>
  );
}
