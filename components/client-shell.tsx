"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/sidebar";
import { PageTransition } from "@/components/layout/page-transition";

const AUTH_PATHS = ["/login"];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));

  if (isAuthPage) {
    return <PageTransition>{children}</PageTransition>;
  }

  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
