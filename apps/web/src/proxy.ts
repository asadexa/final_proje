import { NextResponse, type NextRequest } from "next/server";

// Next 16: 'middleware' -> 'proxy'. (1) 301/302 yonlendirmeler, (2) locale oneki.
const LOCALES = ["tr", "en"] as const;
const DEFAULT_LOCALE = "tr";
const API =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface RedirectRule {
  source: string;
  destination: string;
  statusCode: number;
}

// Yonlendirmeleri API'den cekip in-memory cache'le (60sn) — her istekte API cagrisi yok.
let redirectCache: { at: number; rules: Map<string, RedirectRule> } | null = null;

async function getRedirects(): Promise<Map<string, RedirectRule>> {
  if (redirectCache && Date.now() - redirectCache.at < 60_000) return redirectCache.rules;
  const rules = new Map<string, RedirectRule>();
  try {
    const res = await fetch(`${API}/api/redirects`, { cache: "no-store" });
    if (res.ok) {
      const list = (await res.json()) as RedirectRule[];
      for (const r of list) rules.set(r.source, r);
    }
  } catch {
    // API erisilemezse yonlendirme atlanir, locale akisi devam eder.
  }
  redirectCache = { at: Date.now(), rules };
  return rules;
}

function detectLocale(req: NextRequest): string {
  const accept = req.headers.get("accept-language") ?? "";
  const preferred = accept.split(",")[0]?.split("-")[0]?.toLowerCase();
  return preferred && (LOCALES as readonly string[]).includes(preferred)
    ? preferred
    : DEFAULT_LOCALE;
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // 1) Yonlendirme kurallari (301/302)
  const rules = await getRedirects();
  const hit = rules.get(pathname);
  if (hit) {
    if (/^https?:\/\//.test(hit.destination)) {
      return NextResponse.redirect(hit.destination, hit.statusCode);
    }
    const url = req.nextUrl.clone();
    url.pathname = hit.destination;
    url.search = "";
    return NextResponse.redirect(url, hit.statusCode);
  }

  // 2) Locale oneki (/ -> /tr veya /en)
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // _next, api, admin (locale'siz arac), statik dosyalar haric her yol
  matcher: ["/((?!_next|api|admin|favicon.ico|.*\\..*).*)"],
};
