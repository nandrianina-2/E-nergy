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
      const redirectUrl =
        userRole === "admin" ? "/admin/dashboard" : "/user/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, nextUrl));
    }
    return NextResponse.next();
  }

  // Page racine -> redirige selon état de connexion
  if (nextUrl.pathname === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    const redirectUrl =
      userRole === "admin" ? "/admin/dashboard" : "/user/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, nextUrl));
  }

  // Routes protégées : doit être connecté
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protection des routes admin
  if (nextUrl.pathname.startsWith("/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL("/user/dashboard", nextUrl));
  }

  // Protection des routes user (un admin peut quand même y accéder si besoin, mais on reste strict)
  if (nextUrl.pathname.startsWith("/user") && userRole !== "user") {
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)",
  ],
};
