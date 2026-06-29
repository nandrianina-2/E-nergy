import { auth } from "@/lib/auth/edge-config";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/cron",
  "/offline",
  "/manifest.json",
  "/sw.js",
];

function defaultRedirectFor(role?: string): string {
  if (role === "super_admin") return "/super-admin/organizations";
  if (role === "admin") return "/admin/dashboard";
  return "/user/dashboard";
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    nextUrl.pathname.startsWith(path)
  );

  // Laisser passer les fichiers statiques et les chemins publics
  if (isPublicPath) {
    if (isLoggedIn && nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL(defaultRedirectFor(userRole), nextUrl));
    }
    return NextResponse.next();
  }

  // Page racine -> redirige selon état de connexion
  if (nextUrl.pathname === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return NextResponse.redirect(new URL(defaultRedirectFor(userRole), nextUrl));
  }

  // Routes protégées : doit être connecté
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Routes super-admin : réservées exclusivement au super_admin
  if (nextUrl.pathname.startsWith("/super-admin") && userRole !== "super_admin") {
    return NextResponse.redirect(new URL(defaultRedirectFor(userRole), nextUrl));
  }

  // Protection des routes admin : accessible à admin ET super_admin
  // (le super_admin peut superviser/dépanner l'espace admin si besoin)
  if (
    nextUrl.pathname.startsWith("/admin") &&
    userRole !== "admin" &&
    userRole !== "super_admin"
  ) {
    return NextResponse.redirect(new URL(defaultRedirectFor(userRole), nextUrl));
  }

  // Protection des routes user (un admin/super_admin peut quand même y accéder si besoin)
  if (
    nextUrl.pathname.startsWith("/user") &&
    userRole !== "user" &&
    userRole !== "admin" &&
    userRole !== "super_admin"
  ) {
    return NextResponse.redirect(new URL(defaultRedirectFor(userRole), nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)",
  ],
};
