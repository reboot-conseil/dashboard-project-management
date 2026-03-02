"use client";

import * as React from "react";
import { RotateCw, FileText, Sheet, Mail, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DashboardHeaderProps {
  viewName: string;
  icon: React.ReactNode;
  onRefresh?: () => void;
  onExport?: (type: "pdf" | "excel" | "email") => void;
  isRefreshing?: boolean;
  children?: React.ReactNode; // Pour filtres custom
  className?: string;
}

export function DashboardHeader({
  viewName,
  icon,
  onRefresh,
  onExport,
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
          {/* Bouton Exporter */}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  Exporter
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport("pdf")}>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Exporter PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("excel")}>
                  <Sheet className="h-4 w-4 text-muted-foreground" />
                  Exporter Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onExport("email")}>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Envoyer par email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
