import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "coachify-dev-secret-change-in-production"
);

async function isTokenValid(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("coachify_token")?.value;
  const pathname = request.nextUrl.pathname;

  const isAuthenticated = token ? await isTokenValid(token) : false;

  // If token exists but is invalid/expired, clear it
  if (token && !isAuthenticated) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("coachify_token");
    return response;
  }

  // Authenticated user trying to access login/register → send to dashboard
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user trying to access dashboard → send to login
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/"],
};
