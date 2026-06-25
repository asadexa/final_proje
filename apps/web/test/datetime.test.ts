import { describe, expect, it } from "vitest";
import { isoToLocalInput } from "../src/lib/datetime";

// new Date(yil,ay,...) YEREL saat kurar -> toISOString UTC'ye cevirir -> isoToLocalInput tekrar
// YEREL'e cevirir. Round-trip orijinal yerel bilesenleri vermeli (makinenin timezone'undan bagimsiz).
describe("isoToLocalInput (datetime-local round-trip)", () => {
  it("YEREL saatte datetime-local string uretir (UTC'ye kaymaz)", () => {
    const d = new Date(2026, 5, 25, 14, 30); // 25 Haziran 2026, 14:30 yerel
    expect(isoToLocalInput(d.toISOString())).toBe("2026-06-25T14:30");
  });

  it("tek haneli ay/gun/saat/dakika 0 ile doldurulur", () => {
    const d = new Date(2026, 0, 3, 9, 5); // 3 Ocak 2026, 09:05 yerel
    expect(isoToLocalInput(d.toISOString())).toBe("2026-01-03T09:05");
  });

  it("gece yarisi 00:00 dogru bicimlenir", () => {
    const d = new Date(2026, 11, 31, 0, 0); // 31 Aralik 2026, 00:00 yerel
    expect(isoToLocalInput(d.toISOString())).toBe("2026-12-31T00:00");
  });
});
