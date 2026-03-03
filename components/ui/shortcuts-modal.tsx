"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUTS_BY_PAGE, GLOBAL_SHORTCUTS, type Shortcut } from "@/lib/shortcuts";
import { Keyboard } from "lucide-react";

export function ShortcutsModal() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const pageShortcuts = SHORTCUTS_BY_PAGE[pathname] ?? [];
  const allShortcuts: Shortcut[] = [...GLOBAL_SHORTCUTS, ...pageShortcuts];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {allShortcuts.map(({ keys, action }) => (
            <div key={keys} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{action}</span>
              <kbd className="px-2 py-0.5 rounded border bg-muted text-xs font-mono">{keys}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
