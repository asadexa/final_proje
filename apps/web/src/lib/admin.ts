// Admin paneli istemci tarafi yardimcilari.
//
// A2 (2026-06-25): accessToken artik localStorage'da DEGIL, BELLEKTE (modul degiskeni)
// tutulur — XSS kalici token calamaz. Bu, ADR 0003'un "localStorage + Bearer reddedildi"
// kararina geri hizalanmadir. Sayfa yenilemede bellek silinir; oturum httpOnly refresh
// cookie'si ile sessizce geri alinir (bkz. ensureSession + useAdminGuard).
// Rol de ayri saklanmaz; access token JWT payload'indan cozulur (UI-only; gercek yetki sunucuda).
//
// Cross-origin (web:3000 -> api:4000): login/refresh body'sindeki accessToken ile Bearer auth;
// refresh_token httpOnly cookie credentials:include ile tasinir.

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Bellekte tutulan access token (kalici degil — reload'da refresh ile geri gelir).
let accessToken: string | null = null;

export function getToken(): string | null {
  return accessToken;
}

function setToken(token: string): void {
  accessToken = token;
}

function clearToken(): void {
  accessToken = null;
}

// Onay akisi UI'i icin rol — access token JWT payload'indan cozulur (gercek yetki sunucuda).
export function getRole(): string | null {
  const t = accessToken;
  if (!t) return null;
  try {
    const part = t.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json =
      typeof atob !== "undefined"
        ? atob(b64 + pad)
        : Buffer.from(b64, "base64").toString("utf8");
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<boolean> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // credentials: refresh_token httpOnly cookie'sinin TARAYICIYA yazilmasi icin sart
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) return false;
  setToken(data.accessToken);
  return true;
}

// Sessiz oturum yenileme: access token (15dk) dolunca refresh cookie ile yeni token alinir.
// es zamanli 401'ler tek refresh'i paylasir.
let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken?: string };
      if (!data.accessToken) return false;
      setToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      // es zamanli 401'ler tek refresh'i paylasir; bitince sifirla. window.* degil setTimeout:
      // tarayici + node (test) ortaminda calisir.
      setTimeout(() => {
        refreshing = null;
      }, 0);
    }
  })();
  return refreshing;
}

// Oturum garantisi: bellekte token varsa hazir; yoksa (orn. sayfa yenilendi) refresh cookie
// ile sessizce geri al. useAdminGuard bunu kullanir.
export async function ensureSession(): Promise<boolean> {
  if (accessToken) return true;
  return tryRefresh();
}

// In-memory token'a GUVENMEDEN yeniden dogrula: token'i zorla temizle, refresh cookie ile
// dene. BFCache geri yuklemesi (logout sonrasi back-button) eski token'i heap'e geri getirir;
// access JWT stateless oldugundan ~15dk gecerli kalir. Bu, stale token'i atip refresh cookie
// (logout'ta revoke + silinmis) yoksa false doner -> guard login'e yonlendirir.
export async function revalidateSession(): Promise<boolean> {
  clearToken();
  return tryRefresh();
}

export async function logout(): Promise<void> {
  // Sunucuda refresh token revoke + cookie temizle — aksi halde in-memory token silinse de
  // refresh cookie ile reload'da geri girilebilirdi (sessiz "logout calismadi" bug'i).
  try {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // ag hatasi olsa da yerel temizlige devam
  }
  clearToken();
  if (typeof window !== "undefined") window.location.href = "/admin/login";
}

// Tek dusuk-seviye fetch: token ekle, 401'de sessiz refresh + retry, kalici 401'de login'e
// yonlendir (null doner). adminFetch/adminRequest/adminDownload/adminUpload bunu paylasir (DRY).
// json=false => Content-Type ayarlanmaz (multipart/blob icin).
async function rawAdminFetch(
  path: string,
  init: RequestInit = {},
  opts: { json?: boolean } = {},
): Promise<Response | null> {
  const json = opts.json ?? true;
  const doFetch = (): Promise<Response> => {
    const token = getToken();
    const headers: Record<string, string> = {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(`${API}/api${path}`, { ...init, headers });
  };
  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) res = await doFetch();
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return null;
  }
  return res;
}

// Hata mesajini da tasiyan kanonik varyant: cagiran taraf "hata" ile "bos"u ayirt edebilir
// (sessiz bos-tablo yerine acik hata UI'i icin — C3).
export async function adminRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data?: T; message?: string }> {
  const res = await rawAdminFetch(path, init);
  if (!res) return { ok: false, message: "Oturum süresi doldu." };
  const body = (await res.json().catch(() => null)) as
    | (T & { message?: string | string[] })
    | null;
  if (!res.ok) {
    const m = body?.message;
    return { ok: false, message: Array.isArray(m) ? m.join("; ") : (m ?? `HTTP ${res.status}`) };
  }
  return { ok: true, data: (body ?? {}) as T };
}

// Yalniz veri isteyen cagiranlar icin ince sarmalayici: hata da bos da null doner
// (geriye donuk uyumlu). Hatayi ayirmak gereken yerler adminRequest kullanir.
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const r = await adminRequest<T>(path, init);
  return r.ok ? ((r.data ?? null) as T | null) : null;
}

// Bearer'li dosya indirme (CSV export) -> blob -> tarayicida indir.
export async function adminDownload(path: string, filename: string): Promise<void> {
  const res = await rawAdminFetch(path, {}, { json: false });
  if (!res || !res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Multipart dosya yukleme (Content-Type'i tarayici ayarlar; JSON header EKLENMEZ).
export async function adminUpload<T>(path: string, file: File): Promise<T | null> {
  const form = new FormData();
  form.append("file", file);
  const res = await rawAdminFetch(path, { method: "POST", body: form }, { json: false });
  if (!res || !res.ok) return null;
  return (await res.json()) as T;
}
