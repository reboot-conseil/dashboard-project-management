"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { Activite, Etape } from "./types";

interface ActivitesTableProps {
  activites: Activite[];
  etapes: Etape[];
  filtreEtapeId: number | null;
  onClearFiltre: () => void;
}

export function ActivitesTable({
  activites,
  etapes,
  filtreEtapeId,
  onClearFiltre,
}: ActivitesTableProps) {
  const activitesFiltrees =
    filtreEtapeId !== null
      ? activites.filter((a) => a.etape?.id === filtreEtapeId)
      : activites;

  const filtreNom = filtreEtapeId !== null
    ? etapes.find((e) => e.id === filtreEtapeId)?.nom
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Activités</h2>
        {filtreEtapeId !== null && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Filtre : {filtreNom}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClearFiltre}>
              Tout afficher
            </Button>
          </div>
        )}
      </div>
      <Card>
        <CardContent className="pt-6">
          {activitesFiltrees.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {filtreEtapeId !== null
                ? "Aucune activité liée à cette étape"
                : "Aucune activité enregistrée sur ce projet"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Consultant</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead className="text-right">Heures</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Facturable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitesFiltrees.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(a.date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{a.consultant.nom}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {a.etape ? a.etape.nom : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(a.heures)}h
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {a.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={a.facturable ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {a.facturable ? "Oui" : "Non"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
