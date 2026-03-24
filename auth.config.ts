import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token }) {
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as import("@prisma/client").Role
      }
      return session
    },
  },
} satisfies NextAuthConfig
