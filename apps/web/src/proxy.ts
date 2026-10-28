import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { matchLocale } from "@/i18n/locales";

/** Sends a URL without a language to the same path under the browser's language. */
export function proxy(request: NextRequest) {
  const locale = matchLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();

  url.pathname = url.pathname === "/" ? `/${locale}` : `/${locale}${url.pathname}`;

  return NextResponse.redirect(url, 307);
}

// Only the unprefixed public paths: paths that carry a language, `_next` and `public/` files never reach it.
export const config = {
  matcher: ["/", "/privacy-policy", "/terms-of-use", "/account-deletion", "/designs", "/designs/:path*"],
};
