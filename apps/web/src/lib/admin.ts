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
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) return false;
  setToken(data.accessToken);
  return true;
}

export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") window.location.href = "/admin/login";
}

// Bearer'li admin API cagrisi. 401 -> token temizle + login'e yonlendir.
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const token = getToken();
  const res = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return null;
  }
  if (!res.ok) return null;
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
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
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/api${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return null;
  }
  if (!res.ok) return null;
  return (await res.json()) as T;
}
