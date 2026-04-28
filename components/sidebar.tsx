"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Users2,
  FolderOpen,
  Clock,
  CalendarDays,
  Menu,
  X,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRightLeft,
  FileText,
  Settings,
  Sun,
  Moon,
  LogOut,
  Search,
  RefreshCw,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/lib/hooks/use-theme";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useAlertCount } from "@/lib/hooks/use-alert-count";

// ── Types ────────────────────────────────────────────────────────
type SidebarMode = "full" | "collapsed" | "horizontal";
type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

const NAV_SECTIONS = [
  {
    label: "Navigation",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/consultants", label: "Consultants", icon: Users },
      { href: "/projets", label: "Projets", icon: FolderOpen },
      { href: "/activites", label: "Activités", icon: Clock },
      { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
      { href: "/documents", label: "Documents", icon: FileText },
    ] as NavItem[],
  },
  {
    label: "Compte",
    items: [
      { href: "/parametres", label: "Paramètres", icon: Settings },
    ] as NavItem[],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/users", label: "Utilisateurs", icon: Users2, adminOnly: true },
      { href: "/admin/crakotte", label: "Intégration Crakotte", icon: RefreshCw, adminOnly: true },
    ] as NavItem[],
  },
];

// Flat list used by horizontal navbar
const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

// ── Theme Cycle Button ────────────────────────────────────────────
const THEME_META: Record<Theme, { icon: React.ElementType; label: string; color: string }> = {
  light: { icon: Sun,  label: "Clair",   color: "#1d4ed8" },
  dark:  { icon: Moon, label: "Sombre",  color: "#a78bfa" },
};

function ThemeCycleButton({ theme, onCycle }: { theme: Theme; onCycle: () => void }) {
  const { icon: Icon, label, color } = THEME_META[theme] ?? THEME_META.light;
  return (
    <button
      onClick={onCycle}
      className="p-2 rounded-md hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      title={`Thème : ${label} — cliquer pour changer`}
      aria-label={`Thème actuel : ${label}. Cliquer pour changer.`}
      style={{ color }}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

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
  const { theme, cycle } = useTheme();
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const userRole = session?.user?.role === "ADMIN" ? "Admin" : session?.user?.role === "PM" ? "Chef de projet" : "Consultant";

  return (
    <div className="flex flex-col h-full">

      {/* ── Logo row + ⇌ toggle ── */}
      <div className={cn(
        "h-16 flex items-center border-b border-border shrink-0",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </div>
          {!collapsed && <span className="font-bold text-[15px] text-foreground">PM Dashboard</span>}
        </div>
        {!collapsed && (
          <button
            onClick={onSwitchHorizontal}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Passer en barre horizontale"
            aria-label="Passer en barre horizontale"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Navigation sections ── */}
      <nav className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-1.5" : "px-3")}>
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.adminOnly || session?.user?.role === "ADMIN"
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-1">
              <div className="h-px bg-border/50 mx-1 my-1.5" />
              {collapsed && <div className="h-1" />}
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                  const showAlertBadge = href === "/" && alertCount > 0;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavigate}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center rounded-lg text-[13.5px] font-medium transition-all group relative",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2",
                        active
                          ? collapsed
                            ? "bg-primary/10 text-primary"
                            : "bg-primary/10 text-primary border-l-[2.5px] border-primary pl-[10px]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="relative shrink-0">
                        <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                        {showAlertBadge && collapsed && (
                          <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-3.5 px-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                            {alertCount > 9 ? "9+" : alertCount}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{label}</span>
                          {showAlertBadge && (
                            <span className="h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold">
                              {alertCount > 99 ? "99+" : alertCount}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-card text-foreground text-xs rounded-md shadow-md border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                          {label}
                          {showAlertBadge && <span className="ml-1.5 text-destructive font-bold">({alertCount})</span>}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Search bar ── */}
      {!collapsed && (
        <div className="mx-2.5 mb-1">
          <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2 cursor-text hover:border-border/80 transition-colors">
            <Search className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" aria-hidden="true" />
            <span className="text-[13px] text-muted-foreground/60 flex-1">Rechercher...</span>
            <kbd className="text-[10px] text-muted-foreground/40 bg-surface border border-border rounded px-1 py-0.5 font-sans">⌘K</kbd>
          </div>
        </div>
      )}

      {/* ── Controls row ── */}
      <div className={cn(
        "border-t border-border shrink-0 flex items-center gap-1",
        collapsed ? "flex-col px-1.5 py-2" : "px-2.5 py-2"
      )}>
        <ThemeCycleButton theme={theme} onCycle={cycle} />
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
        {!collapsed && <p className="text-[11px] text-muted-foreground/40 ml-auto pr-1">v1.0</p>}
      </div>

      {/* ── User card ── */}
      <div className={cn(
        "border-t border-border shrink-0",
        collapsed ? "px-1.5 py-2" : "px-2.5 py-3"
      )}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-white shrink-0 cursor-pointer">
              {userInitials}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-foreground truncate">{session?.user?.name ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{userRole} · Reboot Conseil</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
              aria-label="Se déconnecter"
              title="Déconnexion"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
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
  const { theme, cycle } = useTheme();
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="h-12 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <Layers className="h-3.5 w-3.5 text-primary-foreground" aria-hidden="true" />
        </div>
        <span className="font-bold text-[14px] hidden sm:block">PM Dashboard</span>
      </div>

      {/* Navigation (scrollable) */}
      <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0 scrollbar-none">
        {NAV_ITEMS.filter((item) => !item.adminOnly || session?.user?.role === "ADMIN").map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showAlertBadge = href === "/" && alertCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium whitespace-nowrap transition-all shrink-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="relative shrink-0">
                <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
                {showAlertBadge && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </span>
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Search bar */}
      <div className="relative hidden lg:flex items-center shrink-0">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" aria-hidden="true" />
        <input
          className="h-7 w-44 rounded-md border border-border bg-muted pl-8 pr-8 text-xs outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
          placeholder="Rechercher…"
          aria-label="Rechercher"
        />
        <kbd className="absolute right-2 text-[10px] text-muted-foreground/40 bg-surface border border-border rounded px-1 py-0.5 font-sans">⌘K</kbd>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeCycleButton theme={theme} onCycle={cycle} />
        <button
          onClick={onSwitchVertical}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Passer en sidebar verticale"
          aria-label="Passer en sidebar verticale"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white cursor-pointer shrink-0">
          {userInitials}
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
  const { data: session } = useSession();

  const shellUserInitials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

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

        <main className="flex-1 flex flex-col">{children}</main>
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
        {/* Mobile hamburger — only shown on small screens */}
        <div className="md:hidden flex items-center h-12 px-4 border-b border-border bg-card sticky top-0 z-20">
          <button
            className="p-2 rounded-md hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="ml-3 font-semibold text-[14px]">PM Dashboard</span>
          <div className="ml-auto h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white">
            {shellUserInitials}
          </div>
        </div>

        <main className="flex-1 flex flex-col">{children}</main>
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
