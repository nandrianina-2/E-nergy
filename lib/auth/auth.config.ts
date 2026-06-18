import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [], // le provider Credentials est ajouté uniquement dans la version complète
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.avatarUrl = (user as any).avatarUrl;
        token.submeterId = (user as any).submeterId;
        token.language = (user as any).language;
        token.theme = (user as any).theme;
      }

      if (trigger === "update" && session) {
        token.name = session.name ?? token.name;
        token.avatarUrl = session.avatarUrl ?? token.avatarUrl;
        token.language = session.language ?? token.language;
        token.theme = session.theme ?? token.theme;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).avatarUrl = token.avatarUrl;
        (session.user as any).submeterId = token.submeterId;
        (session.user as any).language = token.language;
        (session.user as any).theme = token.theme;
      }
      return session;
    },
  },
  trustHost: true,
};