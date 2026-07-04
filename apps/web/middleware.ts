import { NextResponse, type NextRequest } from "next/server";
import { env } from "./src/lib/env";

const approvalRoles = new Set([
  "CORPORATE_RECRUITER",
  "COLLEGE_ADMIN",
  "FREELANCE_RECRUITER",
  "VENDOR",
  "TRAINING_PARTNER"
]);

const publicPaths = new Set([
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/pending",
  "/suspended"
]);

const protectedPrefixes = ["/dashboard", "/onboarding", "/profile", "/settings"];

const isPublicPath = (pathname: string): boolean => {
  if (publicPaths.has(pathname)) return true;
  if (pathname.startsWith("/verify-email")) return true;
  if (pathname.startsWith("/reset-password")) return true;
  if (pathname.startsWith("/auth/callback")) return true;
  return false;
};

const isProtectedPath = (pathname: string): boolean => {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

const isInternalPath = (pathname: string): boolean => {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg")
  );
};

const withFrom = (request: NextRequest, targetPath: string): URL => {
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  url.search = "";
  url.searchParams.set("from", request.nextUrl.pathname);
  return url;
};

const shouldResolveTenant = (hostname: string): boolean => {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  if (hostname.endsWith(".local")) return false;
  return true;
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isInternalPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("campushire_access_token")?.value;
  const role = request.cookies.get("campushire_user_role")?.value;
  const approved = request.cookies.get("campushire_user_approved")?.value === "1";
  const suspended = request.cookies.get("campushire_user_suspended")?.value === "1";

  if (isProtectedPath(pathname) && !token) {
    return NextResponse.redirect(withFrom(request, "/login"));
  }

  if (token && suspended && pathname !== "/suspended") {
    const url = request.nextUrl.clone();
    url.pathname = "/suspended";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (token && role && approvalRoles.has(role) && !approved && pathname !== "/pending") {
    const url = request.nextUrl.clone();
    url.pathname = "/pending";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (token && isPublicPath(pathname) && pathname !== "/" && pathname !== "/pending" && pathname !== "/suspended") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";

  if (shouldResolveTenant(hostname)) {
    response.headers.set("x-tenant-host", hostname);

    try {
      const apiBase = env.apiUrl;
      const tenantResponse = await fetch(`${apiBase}/api/whitelabel/config`, {
        headers: {
          host: hostname
        },
        cache: "no-store"
      });

      if (tenantResponse.ok) {
        response.headers.set("x-tenant-config", "available");
      } else {
        response.headers.set("x-tenant-config", "unavailable");
      }
    } catch {
      response.headers.set("x-tenant-config", "unavailable");
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
