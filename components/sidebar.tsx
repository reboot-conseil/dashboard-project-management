"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Clock,
  CalendarDays,
  Menu,
  X,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRightLeft,
  Bell,
  FileText,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/hooks/use-theme";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useAlertCount } from "@/lib/hooks/use-alert-count";

// ── Types ────────────────────────────────────────────────────────
type SidebarMode = "full" | "collapsed" | "horizontal";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consultants", label: "Consultants", icon: Users },
  { href: "/projets", label: "Projets", icon: FolderOpen },
  { href: "/activites", label: "Activités", icon: Clock },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

// ── Sidebar Vertical (full & collapsed) ──────────────────────────
function SidebarVertical({
  pathname,
  mode,
  onToggle,
  onSwitchHorizontal,
  onNavigate,
  alertCount,
}: {
  pathname: string;
  mode: "full" | "collapsed";
  onToggle: () => void;
  onSwitchHorizontal: () => void;
  onNavigate?: () => void;
  alertCount: number;
}) {
  const collapsed = mode === "collapsed";
  const { theme, toggle } = useTheme();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-border shrink-0",
          collapsed ? "justify-center px-2" : "gap-3 px-6"
        )}
      >
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Layers className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
        </div>
        {!collapsed && <span className="font-bold text-lg">PM Dashboard</span>}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 py-4 space-y-1 overflow-y-auto", collapsed ? "px-1.5" : "px-3")}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showAlertBadge = href === "/" && alertCount > 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-all group relative",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                active
                  ? collapsed
                    ? "bg-primary/10 text-primary"
                    : "bg-primary/10 text-primary border-l-[3px] border-primary ml-0 pl-[9px]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="relative shrink-0">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {showAlertBadge && collapsed && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {showAlertBadge && (
                    <span className="flex items-center gap-1">
                      <Bell className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                      <span className="h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold">
                        {alertCount > 99 ? "99+" : alertCount}
                      </span>
                    </span>
                  )}
                </>
              )}
              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-card text-foreground text-xs rounded-md shadow-md border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {label}
                  {showAlertBadge && (
                    <span className="ml-1.5 text-destructive font-bold">({alertCount})</span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Controls */}
      <div className={cn("border-t border-border shrink-0", collapsed ? "px-1.5 py-2" : "px-3 py-2")}>
        <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "items-center")}>
          <button
            onClick={onToggle}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            title={collapsed ? "Déplier la sidebar" : "Replier la sidebar"}
            aria-label={collapsed ? "Déplier la sidebar" : "Replier la sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={onSwitchHorizontal}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            title="Passer en barre horizontale"
            aria-label="Passer en barre horizontale"
          >
            <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={toggle}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          {!collapsed && (
            <p className="text-xs text-muted-foreground ml-auto">v1.0</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Navbar Horizontal ────────────────────────────────────────────
function NavbarHorizontal({
  pathname,
  onSwitchVertical,
  alertCount,
}: {
  pathname: string;
  onSwitchVertical: () => void;
  alertCount: number;
}) {
  const { theme, toggle } = useTheme();

  return (
    <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-2 sticky top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4 shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <Layers className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
        </div>
        <span className="font-bold text-sm hidden sm:block">PM Dashboard</span>
      </div>

      {/* Navigation (scrollable) */}
      <nav className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 scrollbar-none">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showAlertBadge = href === "/" && alertCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all shrink-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="relative shrink-0">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {showAlertBadge && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <button
          onClick={onSwitchVertical}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          title="Passer en sidebar verticale"
          aria-label="Passer en sidebar verticale"
        >
          <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={toggle}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          title={theme === "dark" ? "Mode clair" : "Mode sombre"}
          aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">CP</span>
        </div>
      </div>
    </div>
  );
}

// ── AppShell ─────────────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useLocalStorage<SidebarMode>("sidebarMode", "full");
  const { count: alertCount } = useAlertCount();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Auto horizontal on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const effectiveMode = isMobile ? "horizontal" : sidebarMode;

  const crumbs = buildBreadcrumbs(pathname);

  const sidebarWidth = effectiveMode === "full" ? 250 : effectiveMode === "collapsed" ? 60 : 0;

  function toggleCollapse() {
    setSidebarMode(sidebarMode === "full" ? "collapsed" : "full");
  }

  function switchToHorizontal() {
    setSidebarMode("horizontal");
  }

  function switchToVertical() {
    setSidebarMode("full");
  }

  // ── Bypass sidebar pour l'iframe Teams ─────────────────────────
  if (pathname.startsWith("/teams-dashboard")) {
    return <>{children}</>;
  }

  // ── Horizontal mode ────────────────────────────────────────────
  if (effectiveMode === "horizontal") {
    return (
      <div className="min-h-screen flex flex-col">
        <NavbarHorizontal pathname={pathname} onSwitchVertical={switchToVertical} alertCount={alertCount} />

        {/* Header with breadcrumbs (only on non-mobile when horizontal is chosen) */}
        {!isMobile && (
          <header className="h-12 border-b border-border bg-card/80 flex items-center px-4 md:px-6 sticky top-14 z-20">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-border">/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </header>
        )}

        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // ── Vertical mode (full / collapsed) ───────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border z-30 transition-[width] duration-200 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        <SidebarVertical
          pathname={pathname}
          mode={effectiveMode}
          onToggle={toggleCollapse}
          onSwitchHorizontal={switchToHorizontal}
          alertCount={alertCount}
        />
      </aside>

      {/* Mobile overlay (fallback for md breakpoint) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[280px] bg-card shadow-xl z-50">
            <SidebarVertical
              pathname={pathname}
              mode="full"
              onToggle={toggleCollapse}
              onSwitchHorizontal={switchToHorizontal}
              onNavigate={() => setMobileOpen(false)}
              alertCount={alertCount}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-[padding] duration-200 ease-in-out"
        style={{ paddingLeft: sidebarWidth }}
      >
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-md hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={() => setMobileOpen(true)}
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
            <nav className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
              {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-border">/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">CP</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

// ── Breadcrumb builder ─────────────────────────────────────────
function buildBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const segments = pathname.split("/").filter(Boolean);

  const labels: Record<string, string> = {
    consultants: "Consultants",
    projets: "Projets",
    activites: "Activités",
    calendrier: "Calendrier",
    rapports: "Rapports",
    admin: "Admin",
    "teams-config": "Teams Config",
    documents: "Documents",
    upload: "Upload",
    review: "Validation",
  };

  if (segments.length === 0) {
    return [{ label: "Dashboard" }];
  }

  const crumbs: { label: string; href?: string }[] = [
    { label: "Dashboard", href: "/" },
  ];

  let path = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += `/${seg}`;
    const isLast = i === segments.length - 1;
    const label = labels[seg] ?? (isNaN(Number(seg)) ? seg : `#${seg}`);
    crumbs.push({ label, href: isLast ? undefined : path });
  }

  return crumbs;
}
