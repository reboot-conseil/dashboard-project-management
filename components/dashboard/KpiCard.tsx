import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number; // positive = hausse, negative = baisse
    label: string; // ex: "vs mois dernier"
  };
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variantConfig = {
  default: {
    card: "",
    value: "text-foreground",
    icon: "text-muted-foreground",
  },
  success: {
    card: "border-emerald-200/60",
    value: "text-emerald-600",
    icon: "text-emerald-500",
  },
  warning: {
    card: "border-amber-200/60",
    value: "text-amber-700",
    icon: "text-amber-500",
  },
  danger: {
    card: "border-destructive/30",
    value: "text-destructive",
    icon: "text-destructive",
  },
};

export function KpiCard({ title, value, icon, subtitle, trend, variant = "default", className }: KpiCardProps) {
  const config = variantConfig[variant];

  return (
    <Card className={cn("animate-fade-in transition-shadow hover:shadow-md", config.card, className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{title}</CardDescription>
        <span className={cn("h-5 w-5 shrink-0", config.icon)} aria-hidden="true">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold", config.value)}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.value > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : trend.value < 0 ? (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            )}
            <span
              className={cn(
                "text-xs font-semibold",
                trend.value > 0
                  ? "text-emerald-600"
                  : trend.value < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
