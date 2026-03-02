"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, parseISO, eachDayOfInterval, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#6366f1", "#ec4899"];

// ── Pie Heures par consultant ──────────────────────────────────
interface ConsultantPieData {
  nom: string;
  heuresTotal: number;
}

export function ConsultantPieChart({ data }: { data: ConsultantPieData[] }) {
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Répartition des heures par consultant</CardTitle></CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="heuresTotal"
                nameKey="nom"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {data.map((_entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}h`, "Heures"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Bar Horizontal Budget par projet ───────────────────────────
interface ProjetBudgetData {
  nom: string;
  pctBudget: number;
}

export function ProjetBudgetChart({ data }: { data: ProjetBudgetData[] }) {
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Budget utilisé par projet</CardTitle></CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, "dataMax"]} tick={{ fontSize: 12 }} unit="%" />
              <YAxis type="category" dataKey="nom" tick={{ fontSize: 12 }} width={70} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}%`, "Budget utilisé"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}
              />
              <Bar dataKey="pctBudget" radius={[0, 6, 6, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.pctBudget > 100 ? "#ef4444" : entry.pctBudget >= 80 ? "#f59e0b" : "#10b981"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Line Évolution temporelle ──────────────────────────────────
interface TemporelData {
  date: string;
  facturable: number;
  nonFacturable: number;
}

export function EvolutionTemporelleChart({ data }: { data: TemporelData[] }) {
  if (data.length === 0) return null;
  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: fr }),
  }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Évolution des heures</CardTitle></CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
              <Line type="monotone" dataKey="facturable" name="Facturables" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="nonFacturable" name="Non facturables" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Heatmap GitHub-style ───────────────────────────────────────
interface HeatmapData {
  date: string;
  total: number;
}

export function ActivityHeatmap({ data, dateDebut, dateFin }: { data: HeatmapData[]; dateDebut: string; dateFin: string }) {
  if (!dateDebut || !dateFin) return null;

  const hoursMap = new Map(data.map((d) => [d.date, d.total]));
  const allDays = eachDayOfInterval({ start: parseISO(dateDebut), end: parseISO(dateFin) });
  const maxH = Math.max(...data.map((d) => d.total), 1);

  // Group by week
  const weeks: { date: Date; hours: number }[][] = [];
  let currentWeek: { date: Date; hours: number }[] = [];

  for (const day of allDays) {
    const dow = getDay(day); // 0=Sun
    if (dow === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    const key = format(day, "yyyy-MM-dd");
    currentWeek.push({ date: day, hours: hoursMap.get(key) ?? 0 });
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  function intensity(hours: number) {
    if (hours === 0) return "bg-muted";
    const pct = hours / maxH;
    if (pct <= 0.25) return "bg-emerald-200";
    if (pct <= 0.5) return "bg-emerald-300";
    if (pct <= 0.75) return "bg-emerald-500";
    return "bg-emerald-700";
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Carte d&apos;activité</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-0.5">
            {weeks.map((week, wi) => {
              const mondayOfWeek = startOfWeek(week[0].date, { weekStartsOn: 1 });
              const padding = (getDay(week[0].date) + 6) % 7; // days offset from Monday
              return (
                <div key={wi} className="flex flex-col gap-0.5">
                  {Array.from({ length: padding }).map((_, i) => (
                    <div key={`pad-${i}`} className="w-3 h-3" />
                  ))}
                  {week.map((day) => (
                    <div
                      key={day.date.toISOString()}
                      className={`w-3 h-3 rounded-sm ${intensity(day.hours)} transition-colors`}
                      title={`${format(day.date, "EEEE d MMMM", { locale: fr })} : ${day.hours}h`}
                    />
                  ))}
                  {wi % 4 === 0 && (
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      {format(mondayOfWeek, "dd/MM")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <span>Moins</span>
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200" />
            <div className="w-3 h-3 rounded-sm bg-emerald-300" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-700" />
            <span>Plus</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
