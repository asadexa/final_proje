import { NextResponse, type NextRequest } from "next/server";

// Next 16: 'middleware' -> 'proxy'. Locale onekiyle yonlendirme (/ -> /tr veya /en).
const LOCALES = ["tr", "en"] as const;
const DEFAULT_LOCALE = "tr";

function detectLocale(req: NextRequest): string {
  const accept = req.headers.get("accept-language") ?? "";
  const preferred = accept.split(",")[0]?.split("-")[0]?.toLowerCase();
  return preferred && (LOCALES as readonly string[]).includes(preferred)
    ? preferred
    : DEFAULT_LOCALE;
}

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // _next, api, statik dosyalar haric her yol
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
