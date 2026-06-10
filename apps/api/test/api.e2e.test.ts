import request from "supertest";
import { describe, expect, it } from "vitest";

// Entegrasyon testleri: calisan stack'e (docker compose up) HTTP ile.
const API = process.env.API_URL ?? "http://localhost:4000";

describe("content API (entegrasyon)", () => {
  it("GET /api/content/en/home -> 200 + blocks", async () => {
    const res = await request(API).get("/api/content/en/home");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.blocks)).toBe(true);
    expect(res.body.blocks.length).toBeGreaterThan(0);
  });

  it("olmayan slug -> 404", async () => {
    const res = await request(API).get("/api/content/en/boyle-bir-icerik-yok");
    expect(res.status).toBe(404);
  });

  it("hreflang alternates doner", async () => {
    const res = await request(API).get("/api/content/en/home");
    expect(Array.isArray(res.body.alternates)).toBe(true);
  });
});

describe("forms API (entegrasyon)", () => {
  it("GET /api/forms/contact -> 200 + fields", async () => {
    const res = await request(API).get("/api/forms/contact");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.fields)).toBe(true);
  });

  it("KVKK onayi yoksa submit 400", async () => {
    const res = await request(API)
      .post("/api/forms/contact/submit")
      .send({
        data: { fullName: "x", email: "x@e.com", subject: "s", message: "m" },
        consent: false,
      });
    expect(res.status).toBe(400);
  });
});

describe("auth korumasi (entegrasyon)", () => {
  it("admin ucu jetonsuz -> 401", async () => {
    const res = await request(API).get("/api/admin/entries");
    expect(res.status).toBe(401);
  });
});

// --- yeni ozellik akislari (onay, redirect, saglik, restore idempotentligi) ---

async function login(email: string, password: string): Promise<string> {
  const res = await request(API).post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("onay akisi (entegrasyon)", () => {
  it("EDITOR yayinlayamaz (403), REVIEW'a gonderebilir; ADMIN yayinlar", async () => {
    const editor = await login("editor@kron.local", "Editor123!");
    const admin = await login("admin@kron.local", "Admin123!");

    const created = await request(API)
      .post("/api/admin/entries")
      .set("Authorization", `Bearer ${editor}`)
      .send({
        type: "PAGE",
        localeCode: "tr",
        slug: `onay-akisi-test-${Date.now()}`,
        title: "Onay Akisi Testi",
        blocks: [{ type: "RICH_TEXT", order: 0, data: { html: "<p>x</p>" } }],
      });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    const forbidden = await request(API)
      .patch(`/api/admin/entries/${id}`)
      .set("Authorization", `Bearer ${editor}`)
      .send({ status: "PUBLISHED" });
    expect(forbidden.status).toBe(403);

    const review = await request(API)
      .patch(`/api/admin/entries/${id}`)
      .set("Authorization", `Bearer ${editor}`)
      .send({ status: "REVIEW" });
    expect(review.status).toBe(200);

    const publish = await request(API)
      .patch(`/api/admin/entries/${id}`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ status: "PUBLISHED" });
    expect(publish.status).toBe(200);
    expect(publish.body.status).toBe("PUBLISHED");

    await request(API).delete(`/api/admin/entries/${id}`).set("Authorization", `Bearer ${admin}`);
  });
});

describe("redirect yonetimi (entegrasyon)", () => {
  it("gecersiz source ('/' ile baslamayan) -> 400; gecerli kayit CRUD calisir", async () => {
    const admin = await login("admin@kron.local", "Admin123!");

    const bad = await request(API)
      .post("/api/admin/redirects")
      .set("Authorization", `Bearer ${admin}`)
      .send({ source: "eski-url", destination: "/tr/kron-pam" });
    expect(bad.status).toBe(400);

    const ok = await request(API)
      .post("/api/admin/redirects")
      .set("Authorization", `Bearer ${admin}`)
      .send({ source: `/test-${Date.now()}`, destination: "/tr/kron-pam", statusCode: 302 });
    expect(ok.status).toBe(201);

    const del = await request(API)
      .delete(`/api/admin/redirects/${ok.body.id}`)
      .set("Authorization", `Bearer ${admin}`);
    expect(del.status).toBe(200);
  });
});

describe("saglik denetimi (entegrasyon)", () => {
  it("bulgu listesi doner (dizi)", async () => {
    const admin = await login("admin@kron.local", "Admin123!");
    const list = await request(API)
      .get("/api/admin/entries?type=PRODUCT&pageSize=1")
      .set("Authorization", `Bearer ${admin}`);
    const id = list.body.items[0].id as string;
    const res = await request(API)
      .get(`/api/admin/entries/${id}/health`)
      .set("Authorization", `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("surum restore idempotentligi (entegrasyon)", () => {
  it("ayni surume ikinci restore yeni kopya almaz (alreadyAtVersion)", async () => {
    const admin = await login("admin@kron.local", "Admin123!");
    const created = await request(API)
      .post("/api/admin/entries")
      .set("Authorization", `Bearer ${admin}`)
      .send({
        type: "PAGE",
        localeCode: "tr",
        slug: `restore-idem-${Date.now()}`,
        title: "Once",
        blocks: [{ type: "RICH_TEXT", order: 0, data: { html: "<p>once</p>" } }],
      });
    const id = created.body.id as string;

    await request(API)
      .patch(`/api/admin/entries/${id}`)
      .set("Authorization", `Bearer ${admin}`)
      .send({ title: "Sonra" });

    const first = await request(API)
      .post(`/api/admin/entries/${id}/versions/1/restore`)
      .set("Authorization", `Bearer ${admin}`);
    expect(first.body.alreadyAtVersion).toBe(false);

    const second = await request(API)
      .post(`/api/admin/entries/${id}/versions/1/restore`)
      .set("Authorization", `Bearer ${admin}`);
    expect(second.body.alreadyAtVersion).toBe(true);

    const versions = await request(API)
      .get(`/api/admin/entries/${id}/versions`)
      .set("Authorization", `Bearer ${admin}`);
    // v1 (create) + v2 (update) + v3 (ilk restore) — ikinci restore kopya ALMADI
    expect(versions.body.length).toBe(3);

    await request(API).delete(`/api/admin/entries/${id}`).set("Authorization", `Bearer ${admin}`);
  });
});
