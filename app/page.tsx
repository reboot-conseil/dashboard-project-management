"use client";

import { useEffect } from "react";
import { BarChart3, Users, TrendingUp, LayoutDashboard } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardConsultants } from "@/components/dashboard/DashboardConsultants";
import { DashboardOperationnel } from "@/components/dashboard/DashboardOperationnel";
import { DashboardStrategique } from "@/components/dashboard/DashboardStrategique";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { PageHeader } from "@/components/layout/page-header";

// ── Types ─────────────────────────────────────────────────────────────
type VueDashboard = "operationnel" | "consultants" | "strategique";

const VALID_VUES: readonly VueDashboard[] = ["operationnel", "consultants", "strategique"];

// ── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [storedVue, setVue] = useLocalStorage<string>("dashboard-active-view", "operationnel");

  // Validate stored value — fallback to "operationnel" if corrupted
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
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle="Vue d'ensemble de vos projets et consultants"
        icon={<LayoutDashboard className="h-5 w-5" />}
      />
      <Tabs value={vue} onValueChange={setVue}>
        <TabsList className="mb-6">
          <TabsTrigger value="operationnel" title="Vue Opérationnelle (Ctrl+1)">
            <BarChart3 className="h-4 w-4 mr-2" />
            Opérationnel
          </TabsTrigger>
          <TabsTrigger value="consultants" title="Vue Consultants (Ctrl+2)">
            <Users className="h-4 w-4 mr-2" />
            Consultants
          </TabsTrigger>
          <TabsTrigger value="strategique" title="Vue Stratégique (Ctrl+3)">
            <TrendingUp className="h-4 w-4 mr-2" />
            Stratégique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operationnel">
          <DashboardOperationnel />
        </TabsContent>

        <TabsContent value="consultants">
          <DashboardConsultants />
        </TabsContent>

        <TabsContent value="strategique">
          <DashboardStrategique />
        </TabsContent>
      </Tabs>
    </div>
  );
}
