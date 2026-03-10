import type { NextConfig } from "next";

// Valeur CSP partagée — autorise l'iframe depuis tous les domaines Microsoft/Teams
const TEAMS_CSP =
  "frame-ancestors 'self' " +
  "https://*.teams.microsoft.com " +
  "https://*.microsoft.com " +
  "https://*.office.com " +      // Teams via Office 365
  "https://*.sharepoint.com " +  // Teams via SharePoint
  "https://*.skype.com";         // Fallback Skype for Business

const TEAMS_HEADERS = [
  {
    // Autorise l'affichage dans une iframe (valeur large, CSP prend le dessus)
    key: "X-Frame-Options",
    value: "ALLOWALL",
  },
  {
    // Restreint l'iframe aux origines Microsoft uniquement (plus précis que X-Frame-Options)
    key: "Content-Security-Policy",
    value: TEAMS_CSP,
  },
];

const nextConfig: NextConfig = {
  // Génère un build standalone (~200MB) pour Docker
  output: "standalone",

  // pdf-parse charge @napi-rs/canvas au niveau module → exclure du bundle Next.js
  // pour éviter "DOMMatrix is not defined" lors de la collecte des pages
  serverExternalPackages: ["pdf-parse"],

  async headers() {
    return [
      {
        // Route racine exacte : /teams-dashboard
        source: "/teams-dashboard",
        headers: TEAMS_HEADERS,
      },
      {
        // Sous-routes : /teams-dashboard/... (pages futures, assets, etc.)
        source: "/teams-dashboard/:path*",
        headers: TEAMS_HEADERS,
      },
    ];
  },
};

export default nextConfig;
