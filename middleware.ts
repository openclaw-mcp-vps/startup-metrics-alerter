import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_COOKIE_NAME } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard/unlock")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const hasTokenShape = typeof token === "string" && token.includes(".");

  if (hasTokenShape) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Paid access required. Complete checkout to unlock." },
      { status: 402 },
    );
  }

  const redirectUrl = new URL("/dashboard/unlock", request.url);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/metrics", "/api/alerts", "/api/integrations"],
};
