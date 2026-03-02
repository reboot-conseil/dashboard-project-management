import Link from "next/link";
import { Home, FolderOpen, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="text-center max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="text-7xl font-bold text-primary/20">404</p>
          <h1 className="text-2xl font-bold">Page non trouvée</h1>
          <p className="text-muted-foreground">
            La page que vous cherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Accès rapide :</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projets"><FolderOpen className="h-4 w-4" /> Projets</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/consultants"><Users className="h-4 w-4" /> Consultants</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/rapports"><Search className="h-4 w-4" /> Rapports</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
