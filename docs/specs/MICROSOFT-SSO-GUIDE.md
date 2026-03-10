# Guide d'implémentation — Connexion Microsoft SSO
*Rédigé le 2026-03-10 — À implémenter en v2.3*

## Contexte

L'auth actuelle (v2.2) utilise un provider Credentials (email + mot de passe bcrypt).
L'objectif est d'ajouter la connexion via Microsoft Office 365, **restreinte aux comptes @reboot-conseil.com**.

Les deux providers coexisteront en parallèle : SSO Microsoft pour les utilisateurs courants, Credentials conservé pour l'accès d'urgence ADMIN.

---

## Prérequis côté Microsoft Azure

Un administrateur Microsoft de Reboot Conseil doit :

1. Aller sur **[portal.azure.com](https://portal.azure.com)**
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Remplir :
   - Name : `PM Dashboard`
   - Supported account types : `Accounts in this organizational directory only (Reboot Conseil only)`
   - Redirect URI : `https://[DOMAINE_PROD]/api/auth/callback/microsoft-entra-id`
4. Récupérer après création :
   - `Application (client) ID` → `AUTH_MICROSOFT_ENTRA_ID_ID`
   - `Directory (tenant) ID` → `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (format : `https://login.microsoftonline.com/{tenantId}/v2.0`)
5. **Certificates & secrets** → **New client secret** → copier la valeur → `AUTH_MICROSOFT_ENTRA_ID_SECRET`
6. **API permissions** → vérifier que `openid`, `profile`, `email` sont présents (par défaut)

---

## Variables d'environnement à ajouter

Dans `.env` (dev) et `.env.production` (prod) :

```env
AUTH_MICROSOFT_ENTRA_ID_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AUTH_MICROSOFT_ENTRA_ID_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/v2.0
```

---

## Package à installer

```bash
npm install @auth/microsoft-entra-id
```

---

## Modifications de code

### 1. `auth.ts` — Ajouter le provider + callback domaine

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraId from "@auth/microsoft-entra-id"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    // ── Provider Microsoft SSO ──────────────────────────────
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
    }),

    // ── Provider Credentials (conservé pour ADMIN / urgence) ─
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        // ... code existant inchangé
      },
    }),
  ],

  callbacks: {
    // ── Filtrage domaine @reboot-conseil.com ────────────────
    async signIn({ user, account }) {
      if (account?.provider === "microsoft-entra-id") {
        const email = user.email ?? ""
        if (!email.endsWith("@reboot-conseil.com")) {
          return false // Bloque les emails hors domaine
        }
        // Créer ou récupérer le consultant en DB
        const existing = await prisma.consultant.findUnique({ where: { email } })
        if (!existing) {
          // Nouveau compte : créer avec rôle CONSULTANT par défaut
          // Option : retourner false pour exiger une activation admin manuelle
          await prisma.consultant.create({
            data: {
              email,
              nom: user.name ?? email.split("@")[0],
              role: Role.CONSULTANT,
              actif: true,
            },
          })
        } else if (!existing.actif) {
          return false // Compte désactivé
        }
      }
      return true
    },

    jwt({ token, user, account }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: Role }).role
      }
      // Pour SSO : récupérer l'id et le rôle depuis la DB au premier login
      if (account?.provider === "microsoft-entra-id" && user.email) {
        // token sera enrichi via le callback session si nécessaire
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        // Pour SSO : récupérer le rôle depuis la DB (pas dans le JWT initial)
        if (!token.role && session.user.email) {
          const consultant = await prisma.consultant.findUnique({
            where: { email: session.user.email },
            select: { id: true, role: true },
          })
          if (consultant) {
            session.user.id = String(consultant.id)
            session.user.role = consultant.role as Role
          }
        } else {
          session.user.id = token.id as string
          session.user.role = token.role as Role
        }
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
})
```

### 2. `app/(auth)/login/page.tsx` — Ajouter le bouton Microsoft

```tsx
import { signIn } from "@/auth"

// Dans le JSX, ajouter avant le formulaire email/password :
<form action={async () => {
  "use server"
  await signIn("microsoft-entra-id", { redirectTo: "/" })
}}>
  <button
    type="submit"
    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium"
  >
    {/* Logo Microsoft SVG */}
    <svg width="18" height="18" viewBox="0 0 23 23" fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
      <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
    </svg>
    Se connecter avec Microsoft
  </button>
</form>

<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center text-xs text-muted-foreground">
    <span className="px-2 bg-card">ou</span>
  </div>
</div>
{/* formulaire email + password existant */}
```

---

## Décisions à prendre avant implémentation

| Question | Options |
|----------|---------|
| Nouveaux utilisateurs SSO (email @reboot-conseil.com mais pas en DB) | A) Créé automatiquement avec rôle CONSULTANT · B) Bloqué jusqu'à activation admin |
| Mode mixte | Garder Credentials uniquement pour ADMIN, SSO obligatoire pour PM/CONSULTANT |
| Période de transition | Permettre les deux pendant X semaines, puis désactiver Credentials |

**Recommandation :** Option A (auto-création) pour faciliter l'onboarding + mode mixte pour l'ADMIN.

---

## Checklist d'implémentation

- [ ] Admin Azure crée l'App Registration et fournit les 3 credentials
- [ ] Ajouter les variables dans `.env` et `.env.production`
- [ ] `npm install @auth/microsoft-entra-id`
- [ ] Mettre à jour `auth.ts` (provider + callbacks)
- [ ] Mettre à jour `app/(auth)/login/page.tsx` (bouton Microsoft)
- [ ] Tester en dev avec un compte @reboot-conseil.com
- [ ] Tester le blocage avec un compte hors domaine
- [ ] Tester la création auto d'un nouveau consultant
- [ ] Tester que les rôles existants sont préservés
- [ ] Déployer + configurer la Redirect URI en production dans Azure
- [ ] Mettre à jour `CHANGELOG.md`
