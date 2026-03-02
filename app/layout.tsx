import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AppShell } from "@/components/sidebar";
import { PageTransition } from "@/components/layout/page-transition";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PM Dashboard — Gestion de Projet",
  description: "Tableau de bord professionnel de gestion de projet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        ` }} />
      </head>
      <body className="min-h-screen antialiased">
        <AppShell>
          <PageTransition>{children}</PageTransition>
        </AppShell>
        <Toaster richColors position="top-right" />
        <ShortcutsModal />
      </body>
    </html>
  );
}
