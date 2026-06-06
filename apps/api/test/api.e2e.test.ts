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
