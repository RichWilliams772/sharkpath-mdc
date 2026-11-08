import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

// Mounts Auth0's /auth/login, /auth/logout, /auth/callback and /auth/profile
// routes and keeps the session fresh. No-op until Auth0 is configured.
export async function proxy(request: Request) {
  if (!auth0) return NextResponse.next();
  return auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
