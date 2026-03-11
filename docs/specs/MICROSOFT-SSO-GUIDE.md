# Guide d'implémentation — Microsoft SSO + Email automatique
*Rédigé le 2026-03-10 — Mis à jour le 2026-03-11 — À implémenter en v2.3*

## Contexte

Ce guide couvre **deux fonctionnalités** qui partagent la même App Registration Azure :

1. **Connexion Microsoft SSO** — login via Office 365 restreint aux `@reboot-conseil.com`
2. **Email automatique** — envoi d'un email de bienvenue lors de la création d'un compte depuis `/admin/users`

**Avantage clé** : une seule App Registration Azure, deux permissions → zéro duplication de config.

L'auth actuelle (v2.2) utilise un provider Credentials (email + mot de passe bcrypt).
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
7. **Ajouter la permission email** → **Add a permission** → Microsoft Graph → **Application permissions** → chercher `Mail.Send` → cocher → **Add permissions**
8. **Grant admin consent** → cliquer "Grant admin consent for Reboot Conseil" (bouton vert) — indispensable pour les Application permissions
9. Choisir l'adresse d'expédition des emails (ex: `noreply@reboot-conseil.com` ou ton adresse `jonathan.braun@reboot-conseil.com`)

---

## Variables d'environnement à ajouter

Dans `.env` (dev) et `.env.production` (prod) :

```env
# SSO Microsoft
AUTH_MICROSOFT_ENTRA_ID_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AUTH_MICROSOFT_ENTRA_ID_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/v2.0

# Email automatique (même App Registration, même credentials)
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   # même que dans ISSUER
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   # même que AUTH_MICROSOFT_ENTRA_ID_ID
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx # même que AUTH_MICROSOFT_ENTRA_ID_SECRET
EMAIL_FROM=jonathan.braun@reboot-conseil.com               # adresse expéditeur
APP_URL=http://192.168.1.63                                 # URL de l'app (dans l'email)
```

Note : `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID` et `MICROSOFT_CLIENT_SECRET` sont identiques aux variables SSO — tu peux référencer les mêmes valeurs.

---

## Packages à installer

```bash
npm install @auth/microsoft-entra-id   # SSO
# Pas de package supplémentaire pour l'email — Microsoft Graph API via fetch natif
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

---

## Email automatique à la création de compte

### Comment ça fonctionne

1. Admin crée un compte via `/admin/users` → `POST /api/admin/users` avec `action: "create"`
2. Après création réussie, l'API appelle `sendWelcomeEmail(nom, email, password, appUrl)`
3. La fonction obtient un token OAuth2 (client_credentials) via Microsoft Identity
4. Appel Microsoft Graph API pour envoyer l'email depuis `EMAIL_FROM`

### Fichier à créer : `lib/email.ts`

```typescript
// lib/email.ts
export async function sendWelcomeEmail(nom: string, email: string, password: string) {
  const tenantId = process.env.MICROSOFT_TENANT_ID!
  const clientId = process.env.MICROSOFT_CLIENT_ID!
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  const from = process.env.EMAIL_FROM!
  const appUrl = process.env.APP_URL ?? "http://192.168.1.63"

  // 1. Obtenir un access token (client credentials flow)
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  )
  if (!tokenRes.ok) throw new Error("Impossible d'obtenir le token Microsoft")
  const { access_token } = await tokenRes.json()

  // 2. Envoyer l'email via Microsoft Graph
  const mailRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${from}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: "Votre accès PM Dashboard — Reboot Conseil",
          body: {
            contentType: "HTML",
            content: `
              <p>Bonjour <strong>${nom}</strong>,</p>
              <p>Votre accès à la plateforme <strong>PM Dashboard</strong> de Reboot Conseil a été créé.</p>
              <table>
                <tr><td><strong>URL</strong></td><td><a href="${appUrl}">${appUrl}</a></td></tr>
                <tr><td><strong>Email</strong></td><td>${email}</td></tr>
                <tr><td><strong>Mot de passe</strong></td><td>${password}</td></tr>
              </table>
              <p>Nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
              <p>Cordialement,<br>L'équipe Reboot Conseil</p>
            `,
          },
          toRecipients: [{ emailAddress: { address: email } }],
        },
        saveToSentItems: false,
      }),
    }
  )
  if (!mailRes.ok) {
    const err = await mailRes.json().catch(() => ({}))
    throw new Error(`Erreur envoi email : ${JSON.stringify(err)}`)
  }
}
```

### Modification de `app/api/admin/users/route.ts`

Dans le cas `action === "create"`, après `prisma.consultant.create(...)`, ajouter :

```typescript
import { sendWelcomeEmail } from "@/lib/email"

// Après la création du consultant :
try {
  await sendWelcomeEmail(nom, email, password)
} catch (emailError) {
  // L'email échoue silencieusement — le compte est déjà créé
  console.error("Email de bienvenue non envoyé :", emailError)
}
```

L'email échoue **silencieusement** : si Microsoft Graph n'est pas configuré, le compte est quand même créé. L'admin peut renvoyer les identifiants manuellement.

### Sécurité

⚠️ Le mot de passe temporaire est envoyé en clair dans l'email. Acceptable pour un outil interne, mais l'utilisateur doit changer son mot de passe à la première connexion. Une future amélioration pourrait envoyer un lien de reset plutôt que le mot de passe.

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

### Azure (côté admin Microsoft — à faire en premier)
- [ ] Créer l'App Registration (`PM Dashboard`)
- [ ] Ajouter permission `Mail.Send` (Application) + Grant admin consent
- [ ] Récupérer `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`
- [ ] Configurer la Redirect URI pour le SSO

### Code
- [ ] Ajouter toutes les variables dans `.env` et `.env.production`
- [ ] `npm install @auth/microsoft-entra-id`
- [ ] Créer `lib/email.ts` avec `sendWelcomeEmail()`
- [ ] Mettre à jour `auth.ts` (provider Microsoft + callbacks)
- [ ] Mettre à jour `app/(auth)/login/page.tsx` (bouton Microsoft)
- [ ] Mettre à jour `app/api/admin/users/route.ts` (appel `sendWelcomeEmail` après création)

### Tests
- [ ] Tester envoi email depuis `/admin/users` → créer un compte → vérifier réception
- [ ] Tester SSO avec un compte @reboot-conseil.com
- [ ] Tester le blocage avec un compte hors domaine
- [ ] Tester que l'email échoue silencieusement si Graph non configuré
- [ ] Tester que les rôles existants sont préservés

### Déploiement
- [ ] Déployer via `bash infra/deploy.sh`
- [ ] Mettre à jour `CHANGELOG.md` (v2.3.0)
