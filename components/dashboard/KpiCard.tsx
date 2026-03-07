import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiSparkline } from "@/components/charts/kpi-sparkline";

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number; // positive = hausse, negative = baisse
    label: string; // ex: "vs mois dernier"
  };
  variant?: "default" | "success" | "warning" | "danger";
  /** Hero card: full gradient bg, white text, spans 2 cols (set col-span-2 in parent) */
  isHero?: boolean;
  /** Mini sparkline data (array of numbers) */
  sparkline?: number[];
  /** Show skeleton loading state */
  isLoading?: boolean;
  /** Color of the 7px dot indicator next to the label */
  dotColor?: string;
  /** Override sparkline/trend color */
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

const variantDotColor: Record<string, string> = {
  default:  "var(--color-primary)",
  success:  "var(--color-success)",
  warning:  "var(--color-warning)",
  danger:   "var(--color-destructive)",
};

const variantSparklineColor: Record<string, string> = {
  default:  "var(--color-primary)",
  success:  "var(--color-success)",
  warning:  "var(--color-warning)",
  danger:   "var(--color-destructive)",
};

export function KpiCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  variant = "default",
  isHero = false,
  sparkline,
  isLoading = false,
  dotColor,
  accentColor,
  className,
  style,
}: KpiCardProps) {
  const resolvedDotColor      = dotColor   ?? variantDotColor[variant];
  const resolvedSparklineColor = isHero
    ? "rgba(255,255,255,0.65)"
    : accentColor ?? variantSparklineColor[variant];

  const hasTrendOrSparkline = !!(trend || sparkline);

  return (
    <div
      className={cn(
        "group relative overflow-hidden p-5 animate-fade-in",
        isHero
          ? "rounded-[var(--radius-lg)] text-white"
          : "card hover:-translate-y-px",
        className
      )}
      style={
        isHero
          ? {
              background:  "linear-gradient(135deg, #1E40AF 0%, #2563EB 55%, #3B82F6 100%)",
              boxShadow:   "var(--shadow-primary)",
              borderRadius: "var(--radius-lg)",
              animationFillMode: "both",
              ...style,
            }
          : { animationFillMode: "both", ...style }
      }
    >
      {/* ── Expand icon (↗) — visible on hover ─────────────────── */}
      <span
        className={cn(
          "absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          isHero
            ? "text-white/60 hover:text-white hover:bg-white/10"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)]"
        )}
        aria-label={`Agrandir ${title}`}
        role="img"
      >
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>

      {/* ── Label row: dot + title + optional legacy icon ───────── */}
      <div className="flex items-center gap-1.5 mb-3 pr-6">
        <span
          className="shrink-0 rounded-full"
          style={{
            width:           7,
            height:          7,
            backgroundColor: isHero ? "rgba(255,255,255,0.65)" : resolvedDotColor,
          }}
          aria-hidden="true"
        />
        <span
          className={cn(
            "text-[11px] font-medium tracking-wide leading-none truncate",
            isHero ? "text-white/80" : "text-[var(--color-muted-foreground)]"
          )}
        >
          {title}
        </span>
        {icon && (
          <span
            className={cn(
              "ml-auto shrink-0 opacity-40",
              isHero ? "text-white" : "text-[var(--color-muted-foreground)]"
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      {/* ── Value ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="skeleton h-10 w-2/3 rounded-md mb-3" />
      ) : (
        <div
          className={cn(
            "font-bold leading-none tracking-[-0.02em] tabular-nums mb-3",
            isHero
              ? "text-[2.75rem] text-white"
              : "text-[2.375rem] text-[var(--color-foreground)]"
          )}
        >
          {value}
        </div>
      )}

      {/* ── Subtitle ────────────────────────────────────────────── */}
      {subtitle && !isLoading && (
        <p
          className={cn(
            "text-[13px] leading-none mb-3",
            isHero ? "text-white/70" : "text-[var(--color-muted-foreground)]"
          )}
        >
          {subtitle}
        </p>
      )}

      {/* ── Bottom row: sparkline + trend column ────────────────── */}
      {hasTrendOrSparkline && (
        <div className="flex items-end gap-3 mt-1">
          {/* Sparkline */}
          {isLoading ? (
            <div className="skeleton h-8 flex-1 rounded" />
          ) : sparkline ? (
            <div className="flex-1 min-w-0">
              <KpiSparkline data={sparkline} color={resolvedSparklineColor} height={36} />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Trend column: badge stacked above comparison label */}
          {trend && !isLoading && (
            <div className="flex flex-col items-end ml-auto shrink-0">
              {/* Arrow (aria-hidden) + percentage (own span so tests can find it) */}
              <div
                className={cn(
                  "flex items-center gap-0.5 text-[12px] font-semibold leading-none",
                  isHero
                    ? trend.value > 0 ? "text-white"    : trend.value < 0 ? "text-red-200"    : "text-white/70"
                    : trend.value > 0 ? "text-[var(--color-success)]" : trend.value < 0 ? "text-[var(--color-destructive)]" : "text-[var(--color-muted-foreground)]"
                )}
              >
                <span aria-hidden="true">
                  {trend.value > 0 ? "↑" : trend.value < 0 ? "↓" : "—"}
                </span>
                <span>
                  {trend.value > 0 ? "+" : ""}{trend.value}%
                </span>
              </div>
              {/* Comparison label */}
              <span
                className={cn(
                  "text-[11px] leading-none mt-1",
                  isHero ? "text-white/60" : "text-[var(--color-muted-foreground)]"
                )}
              >
                {trend.label}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
