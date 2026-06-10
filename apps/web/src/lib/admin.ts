// Admin paneli istemci tarafi yardimcilari.
// Cross-origin (web:3000 -> api:4000) + cookie SameSite=Lax dev'de gonderilmiyor;
// bu yuzden login body'sindeki accessToken ile Bearer auth kullanilir (localStorage).

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "kron_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<boolean> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // credentials: refresh_token httpOnly cookie'sinin TARAYICIYA yazilmasi icin sart
    // (localhost:3000 -> :4000 same-site; CORS credentials acik)
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) return false;
  setToken(data.accessToken);
  return true;
}

// Sessiz oturum yenileme: access token (15dk) dolunca refresh cookie ile yeni
// token alinir; kullanici calismaya devam eder (onceki davranis: aniden logout).
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
      // es zamanli 401'ler tek refresh'i paylasir; bitince sifirla
      window.setTimeout(() => {
        refreshing = null;
      }, 0);
    }
  })();
  return refreshing;
}

export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") window.location.href = "/admin/login";
}

// Bearer'li admin API cagrisi. 401 -> once sessiz refresh dene, olmazsa login'e yonlendir.
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const doFetch = async (): Promise<Response> => {
    const token = getToken();
    return fetch(`${API}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };
  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) res = await doFetch();
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return null;
  }
  if (!res.ok) return null;
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

// adminFetch hata govdesini yutar; bu varyant API'nin dondurdugu mesaji da tasir
// (editor "Kaydet" gibi kullaniciya neden gostermek isteyen yerler icin).
export async function adminRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data?: T; message?: string }> {
  const doFetch = async (): Promise<Response> => {
    const token = getToken();
    return fetch(`${API}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };
  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) res = await doFetch();
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return { ok: false, message: "Oturum süresi doldu." };
  }
  const body = (await res.json().catch(() => null)) as
    | (T & { message?: string | string[] })
    | null;
  if (!res.ok) {
    const m = body?.message;
    return { ok: false, message: Array.isArray(m) ? m.join("; ") : (m ?? `HTTP ${res.status}`) };
  }
  return { ok: true, data: (body ?? {}) as T };
}

// Bearer'li dosya indirme (CSV export) -> blob -> tarayicida indir.
export async function adminDownload(path: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return;
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
  const doFetch = async (): Promise<Response> => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API}/api${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  };
  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) res = await doFetch();
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return null;
  }
  if (!res.ok) return null;
  return (await res.json()) as T;
}
