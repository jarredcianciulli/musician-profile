import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function accountBaseFromEnv(): string {
  return (process.env.NEXT_PUBLIC_ACCOUNT_DOMAIN || "").replace(/\/$/, "");
}

function marketingBaseFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_MARKETING_DOMAIN ||
    process.env.NEXT_PUBLIC_WEBSITE_DOMAIN ||
    "https://batterystringstudio.com"
  ).replace(/\/$/, "");
}

function isAccountHostname(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  return h.startsWith("account.") || h.startsWith("account-staging.");
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname, search } = request.nextUrl;
  const accountBase = accountBaseFromEnv();
  const marketingBase = marketingBaseFromEnv();

  // Dedicated account host: keep users on the portal surface
  if (isAccountHostname(host)) {
    if (pathname === "/" || pathname === "") {
      const url = request.nextUrl.clone();
      url.pathname = "/account";
      return NextResponse.rewrite(url);
    }
    // Allow account + static assets + Next internals
    if (
      pathname.startsWith("/account") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/brand") ||
      pathname === "/favicon.ico" ||
      pathname === "/favicon.svg" ||
      pathname === "/robots.txt" ||
      pathname.startsWith("/icon") ||
      pathname.startsWith("/apple-touch")
    ) {
      return NextResponse.next();
    }
    // Marketing pages don't belong here — send to main site
    return NextResponse.redirect(new URL(pathname + search, marketingBase));
  }

  // Marketing host: prefer account subdomain when configured
  if (
    accountBase &&
    (pathname === "/account" || pathname.startsWith("/account/"))
  ) {
    return NextResponse.redirect(new URL(pathname + search, accountBase));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Skip static files that don't need host logic.
     */
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)",
  ],
};
