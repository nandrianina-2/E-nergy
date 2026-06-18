import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user";
      avatarUrl?: string;
      submeterId?: string | null;
      language?: "fr" | "mg";
      theme?: "light" | "dark";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "admin" | "user";
    avatarUrl?: string;
    submeterId?: string | null;
    language?: "fr" | "mg";
    theme?: "light" | "dark";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "user";
    avatarUrl?: string;
    submeterId?: string | null;
    language?: "fr" | "mg";
    theme?: "light" | "dark";
  }
}
