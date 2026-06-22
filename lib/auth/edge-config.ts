// Version edge-safe de la config NextAuth pour le middleware.
// Cette version ne contient PAS de connexion MongoDB (incompatible avec l'Edge Runtime).
// La vraie connexion DB est dans lib/auth/config.ts, utilisée par les API routes.
import NextAuth from "next-auth";

export const { auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [], // providers vides : le middleware ne fait que vérifier le JWT, pas authentifier
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.submeterId = (user as any).submeterId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).submeterId = token.submeterId;
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
});
