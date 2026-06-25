import { beforeEach, describe, expect, it, vi } from "vitest";

// admin.ts'i fetch'i mock'layarak test eder: 401 -> sessiz refresh -> retry, ve adminRequest'in
// "hata" ile "bos"u ayirmasi (C3/C5). Node ortami: window tanimsiz -> redirect atlanir (guvenli).
// Her test modulu sifirlar (in-memory accessToken/refreshing sizmasin).

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("admin auth fetch (adminFetch / adminRequest)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("basari: veriyi doner, tek istek", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(200, { x: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { adminFetch } = await import("../src/lib/admin");
    expect(await adminFetch<{ x: number }>("/admin/entries")).toEqual({ x: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("401 -> refresh -> retry: veriyi doner, retry'de Bearer eklenir", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, {})) // ilk istek
      .mockResolvedValueOnce(res(200, { accessToken: "tok" })) // refresh
      .mockResolvedValueOnce(res(200, { ok: true })); // retry
    vi.stubGlobal("fetch", fetchMock);
    const { adminFetch } = await import("../src/lib/admin");
    expect(await adminFetch("/admin/entries")).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/auth/refresh");
    const retryInit = fetchMock.mock.calls[2][1] as RequestInit;
    expect((retryInit.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("401 -> refresh basarisiz: null doner (redirect node'da atlanir)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, {}))
      .mockResolvedValueOnce(res(401, {})); // refresh de 401
    vi.stubGlobal("fetch", fetchMock);
    const { adminFetch } = await import("../src/lib/admin");
    expect(await adminFetch("/admin/entries")).toBeNull();
  });

  it("adminRequest hata ile bosu ayirir (C3): hata mesajini tasir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(500, { message: "boom" }));
    vi.stubGlobal("fetch", fetchMock);
    const { adminRequest } = await import("../src/lib/admin");
    const r = await adminRequest("/admin/entries");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("boom");
  });

  it("adminRequest basari: ok + data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(200, { items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { adminRequest } = await import("../src/lib/admin");
    const r = await adminRequest<{ items: unknown[] }>("/admin/entries");
    expect(r.ok).toBe(true);
    expect(r.data).toEqual({ items: [] });
  });
});
