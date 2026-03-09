import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ClientShell } from "@/components/client-shell";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { SessionProvider } from "@/components/session-provider";
import { SplashScreen } from "@/components/splash-screen";
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
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            var cl = document.documentElement.classList;
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              cl.add('dark');
            } else if (t === 'cerise') {
              cl.add('theme-cerise');
            } else if (t === 'reboot') {
              cl.add('theme-reboot');
            }
          } catch(e) {}
        ` }} />
      </head>
      <body className="min-h-screen antialiased">
        <SessionProvider>
          <SplashScreen />
          <ClientShell>{children}</ClientShell>
          <Toaster richColors position="top-right" />
          <ShortcutsModal />
        </SessionProvider>
      </body>
    </html>
  );
}
