import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const PUBLIC_PATHS = ["/login", "/api/auth"];
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    nextUrl.pathname.startsWith(path)
  );

  if (isPublicPath) {
    if (isLoggedIn && nextUrl.pathname === "/login") {
      const redirectUrl =
        userRole === "admin" ? "/admin/dashboard" : "/user/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, nextUrl));
    }
    return NextResponse.next();
  }

  if (nextUrl.pathname === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    const redirectUrl =
      userRole === "admin" ? "/admin/dashboard" : "/user/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, nextUrl));
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (nextUrl.pathname.startsWith("/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL("/user/dashboard", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/user") && userRole !== "user") {
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)",
  ],
};