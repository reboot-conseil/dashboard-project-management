"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DashboardHeaderProps {
  viewName?: string;
  icon?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function DashboardHeader({
  onRefresh,
  isRefreshing = false,
  children,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Rafraîchir"
          className="h-8 w-8 shrink-0"
        >
          <RotateCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} aria-hidden="true" />
          <span className="sr-only">Rafraîchir</span>
        </Button>
      )}
    </div>
  );
}
