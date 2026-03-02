"use client";

import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Activite } from "./types";
import { consultantColor } from "./types";

interface SemaineViewProps {
  activites: Activite[];
  weekDays: Date[];
}

export function SemaineView({ activites, weekDays }: SemaineViewProps) {
  return (
    <Card data-testid="semaine-view">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Cette semaine</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 overflow-x-auto">
          {weekDays.map((day) => {
            const dayActivites = activites.filter((a) => {
              const d = new Date(a.date);
              return (
                d.getFullYear() === day.getFullYear() &&
                d.getMonth() === day.getMonth() &&
                d.getDate() === day.getDate()
              );
            });
            const totalH = dayActivites.reduce((s, a) => s + Number(a.heures), 0);
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`rounded-lg border p-2 min-h-[100px] ${today ? "border-primary bg-primary/5" : "border-border"}`}
                data-testid={`semaine-day-${format(day, "yyyy-MM-dd")}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-medium capitalize ${today ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEE d", { locale: fr })}
                  </span>
                  {totalH > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {totalH}h
                    </Badge>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayActivites.map((a) => (
                    <div
                      key={a.id}
                      className="text-xs rounded px-1 py-0.5 truncate"
                      style={{
                        backgroundColor: consultantColor(a.consultant.id, a.consultant.couleur) + "15",
                        borderLeft: `2px solid ${consultantColor(a.consultant.id, a.consultant.couleur)}`,
                      }}
                      title={`${a.consultant.nom} - ${Number(a.heures)}h - ${a.description || ""}`}
                    >
                      <span className="font-medium">{Number(a.heures)}h</span>{" "}
                      <span className="text-muted-foreground">{a.consultant.nom.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
