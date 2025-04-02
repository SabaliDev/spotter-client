import { NextResponse } from "next/server";

export function middleware(request) {
  const authToken = request.cookies.get("authToken");
  const { pathname } = request.nextUrl;

  // Validate token properly
  const validToken = authToken?.value && authToken.value.trim() !== "undefined";

  // Define protected and authentication routes
  const protectedRoutes = ["/dashboard", "/profile", "/settings", "/locations", "/logs"];
  const authRoutes = ["/login", "/register", "/forgot-password"];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.includes(pathname);

  if (isAuthRoute && validToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

 

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
