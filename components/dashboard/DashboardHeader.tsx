"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DashboardHeaderProps {
  viewName: string;
  icon: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function DashboardHeader({
  viewName,
  icon,
  onRefresh,
  isRefreshing = false,
  children,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Ligne 1 : icône + nom + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h2 className="text-xl font-bold tracking-tight">{viewName}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton Rafraîchir */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Rafraîchir"
              className="gap-1.5"
            >
              <RotateCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="sr-only">Rafraîchir</span>
            </Button>
          )}
        </div>
      </div>

      {/* Ligne 2 : filtres */}
      {children && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Filtres :</span>
          {children}
        </div>
      )}
    </div>
  );
}
