import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// API publish/guncelleme yapinca cagrilir -> ISR tag'lerini temizler (anlik tazeleme).
// Paylasilan REVALIDATE_SECRET ile korunur.
const SECRET = process.env.REVALIDATE_SECRET ?? "change-me-revalidate-secret";

export async function POST(req: Request): Promise<NextResponse> {
  let body: { secret?: string; tags?: string[] };
  try {
    body = (await req.json()) as { secret?: string; tags?: string[] };
  } catch {
    return NextResponse.json({ error: "Gecersiz govde" }, { status: 400 });
  }
  if (body.secret !== SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const tags = Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ["content"];
  // Next 16: ikinci arg zorunlu. Harici webhook (API) anlik tazeleme istedigi icin { expire: 0 }.
  for (const t of tags) revalidateTag(t, { expire: 0 });
  return NextResponse.json({ revalidated: true, tags });
}
