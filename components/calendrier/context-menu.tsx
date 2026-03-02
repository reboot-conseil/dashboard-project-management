"use client";

import Link from "next/link";
import { Play, Check, RotateCcw, Pencil, ExternalLink, Clock, Trash2 } from "lucide-react";
import type { EtapeInfo } from "./types";

interface ContextMenuProps {
  x: number;
  y: number;
  etape: EtapeInfo;
  onClose: () => void;
  onOpenDetail: () => void;
  onChangerStatut: (s: string) => void;
  onNavigate: (id: number) => void;
  onSupprimer: () => void;
}

export function ContextMenu({ x, y, etape, onClose, onOpenDetail, onChangerStatut, onNavigate, onSupprimer }: ContextMenuProps) {
  const menuWidth = 220;
  const menuHeight = 280;
  const adjX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return (
    <div
      className="fixed z-[100] bg-background border border-border rounded-lg shadow-xl py-1 text-sm"
      style={{ left: adjX, top: adjY, width: `${menuWidth}px` }}
      onClick={(e) => e.stopPropagation()}
      data-testid="context-menu"
    >
      {etape.statut === "A_FAIRE" && (
        <button className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
          onClick={() => { onChangerStatut("EN_COURS"); onClose(); }}>
          <Play className="h-3.5 w-3.5 text-blue-500" />Démarrer
        </button>
      )}
      {etape.statut === "EN_COURS" && (
        <button className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
          onClick={() => { onChangerStatut("VALIDEE"); onClose(); }}>
          <Check className="h-3.5 w-3.5 text-emerald-500" />Marquer validée
        </button>
      )}
      {etape.statut === "VALIDEE" && (
        <button className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
          onClick={() => { onChangerStatut("EN_COURS"); onClose(); }}>
          <RotateCcw className="h-3.5 w-3.5" />Réouvrir
        </button>
      )}
      <button className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2" onClick={onOpenDetail}>
        <Pencil className="h-3.5 w-3.5" />Modifier / Détails
      </button>
      <div className="border-t border-border my-1" />
      <button className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
        onClick={() => { onNavigate(etape.projet.id); onClose(); }}>
        <ExternalLink className="h-3.5 w-3.5" />Voir projet
      </button>
      <Link href={`/activites?etapeId=${etape.id}`}
        className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
        onClick={onClose}>
        <Clock className="h-3.5 w-3.5" />Logger heures
      </Link>
      <div className="border-t border-border my-1" />
      <button className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 text-destructive"
        onClick={() => { onSupprimer(); onClose(); }}>
        <Trash2 className="h-3.5 w-3.5" />Supprimer
      </button>
    </div>
  );
}
