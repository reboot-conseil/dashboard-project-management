import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    // ── Microsoft SSO ──────────────────────────────────────
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
    }),

    // ── Credentials (ADMIN / urgence) ──────────────────────
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null
        const consultant = await prisma.consultant.findUnique({
          where: { email },
          select: { id: true, email: true, nom: true, password: true, role: true, actif: true },
        })
        if (!consultant || !consultant.password || !consultant.actif) return null
        const valid = await bcrypt.compare(password, consultant.password)
        if (!valid) return null
        return {
          id: String(consultant.id),
          email: consultant.email,
          name: consultant.nom,
          role: consultant.role,
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "microsoft-entra-id") {
        const email = user.email ?? ""
        // Bloquer les emails hors domaine
        if (!email.endsWith("@reboot-conseil.com")) return false
        // Créer ou vérifier le consultant en DB (upsert atomique)
        const CONSULTANT_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#F97316"]
        const count = await prisma.consultant.count()
        const consultant = await prisma.consultant.upsert({
          where: { email },
          update: {},
          create: {
            email,
            nom: user.name ?? email.split("@")[0],
            role: Role.CONSULTANT,
            actif: true,
            couleur: CONSULTANT_COLORS[count % CONSULTANT_COLORS.length],
          },
        })
        if (!consultant.actif) return false
      }
      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "microsoft-entra-id") {
          // SSO : récupérer id et rôle réels depuis la DB
          const consultant = await prisma.consultant.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true },
          })
          if (consultant) {
            token.id = String(consultant.id)
            token.role = consultant.role
          }
        } else {
          // Credentials : id et rôle fournis par authorize()
          token.id = user.id as string
          token.role = (user as { role: Role }).role
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },

  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
})
