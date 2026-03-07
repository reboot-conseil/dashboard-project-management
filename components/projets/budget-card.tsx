"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function formatEuros(montant: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

function budgetColor(pct: number) {
  if (pct > 100) return "bg-destructive";
  if (pct >= 80) return "bg-amber-500";
  return "bg-emerald-700";
}

interface BudgetCardProps {
  budgetNum: number;
  budgetConsomme: number;
  coutReel: number;
  marge: number;
}

export function BudgetCard({ budgetNum, budgetConsomme, coutReel, marge }: BudgetCardProps) {
  const pctBudget = budgetNum > 0 ? Math.round((budgetConsomme / budgetNum) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Analyse Budgétaire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Graphique empilé */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Budget alloué</span>
            <span className="font-bold">{formatEuros(budgetNum)}</span>
          </div>
          <div className="h-8 w-full bg-muted rounded-lg overflow-hidden flex" data-testid="budget-bar">
            {coutReel > 0 && (
              <div
                className="bg-destructive flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${Math.min((coutReel / budgetNum) * 100, 100)}%` }}
                data-testid="budget-bar-cout"
              >
                {(coutReel / budgetNum) * 100 > 10 ? "Coût" : ""}
              </div>
            )}
            {marge > 0 && (
              <div
                className="bg-emerald-700 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${Math.min((marge / budgetNum) * 100, 100)}%` }}
                data-testid="budget-bar-marge"
              >
                {(marge / budgetNum) * 100 > 10 ? "Marge" : ""}
              </div>
            )}
            {budgetNum - budgetConsomme > 0 && (
              <div className="bg-muted flex-1" />
            )}
          </div>
        </div>

        {/* Détails */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">CA Facturable</p>
            <p className="text-xl font-bold" data-testid="budget-ca">{formatEuros(budgetConsomme)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Coût Réel</p>
            <p className="text-xl font-bold text-destructive" data-testid="budget-cout">{formatEuros(coutReel)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Marge Brute</p>
            <p
              className={`text-xl font-bold ${marge >= 0 ? "text-emerald-700" : "text-destructive"}`}
              data-testid="budget-marge"
            >
              {formatEuros(marge)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Reste Budget</p>
            <p className="text-xl font-bold" data-testid="budget-reste">
              {formatEuros(Math.max(budgetNum - budgetConsomme, 0))}
            </p>
          </div>
        </div>

        {/* Alerte dépassement */}
        {budgetConsomme > budgetNum && (
          <div
            className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5"
            data-testid="budget-alerte"
          >
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-destructive">Budget dépassé !</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dépassement de {formatEuros(budgetConsomme - budgetNum)}.
                Taux d&apos;utilisation : {pctBudget}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
