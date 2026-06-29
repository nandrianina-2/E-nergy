import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, Organization } from "@/lib/models";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase().trim(),
        }).select("+password");

        if (!user) {
          throw new Error("Email ou mot de passe incorrect");
        }

        if (!user.isActive) {
          throw new Error("Ce compte a été désactivé. Contactez l'administrateur.");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          throw new Error("Email ou mot de passe incorrect");
        }

        // Le super_admin n'a pas d'organisation et n'est jamais bloqué par un abonnement.
        if (user.role !== "super_admin" && user.organizationId) {
          const org = await Organization.findById(user.organizationId);
          if (!org || !org.isActive) {
            throw new Error(
              "Votre organisation a été désactivée. Contactez l'administrateur principal."
            );
          }
          if (
            org.subscriptionStatus === "suspended" ||
            org.subscriptionStatus === "expired"
          ) {
            throw new Error(
              "L'abonnement de votre organisation est suspendu ou expiré. Contactez l'administrateur principal."
            );
          }
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId ? user.organizationId.toString() : null,
          avatarUrl: user.avatarUrl,
          submeterId: user.submeterId ? user.submeterId.toString() : null,
          language: user.language,
          theme: user.theme,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.avatarUrl = (user as any).avatarUrl;
        token.submeterId = (user as any).submeterId;
        token.language = (user as any).language;
        token.theme = (user as any).theme;
      }

      // Permet de mettre à jour la session côté client (ex: après modif profil)
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
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).avatarUrl = token.avatarUrl;
        (session.user as any).submeterId = token.submeterId;
        (session.user as any).language = token.language;
        (session.user as any).theme = token.theme;
      }
      return session;
    },
  },
  trustHost: true,
});
