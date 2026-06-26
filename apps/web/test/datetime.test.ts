import { describe, expect, it } from "vitest";
import { absoluteDate, absoluteDateTime, isoToLocalInput, relativeTime } from "../src/lib/datetime";

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

describe("relativeTime (icerik listesi 'Son güncelleme')", () => {
  const now = new Date(2026, 5, 25, 14, 30); // sabit referans: 25 Haziran 2026, 14:30 yerel
  const ago = (ms: number): string => new Date(now.getTime() - ms).toISOString();
  const S = 1000;
  const M = 60 * S;
  const H = 60 * M;
  const D = 24 * H;

  it("45 sn altinda 'az önce'", () => {
    expect(relativeTime(ago(10 * S), now)).toBe("az önce");
  });
  it("dakikalar 'N dk önce'", () => {
    expect(relativeTime(ago(5 * M), now)).toBe("5 dk önce");
  });
  it("saatler 'N saat önce'", () => {
    expect(relativeTime(ago(2 * H), now)).toBe("2 saat önce");
  });
  it("1 gun 'Dün'", () => {
    expect(relativeTime(ago(1 * D), now)).toBe("Dün");
  });
  it("birkac gun 'N gün önce'", () => {
    expect(relativeTime(ago(3 * D), now)).toBe("3 gün önce");
  });
  it("haftalar 'N hafta önce'", () => {
    expect(relativeTime(ago(14 * D), now)).toBe("2 hafta önce");
  });
  it("4 haftadan eski mutlak tarihe duser", () => {
    expect(relativeTime(ago(40 * D), now)).toBe(absoluteDate(ago(40 * D)));
  });
});

describe("absoluteDate / absoluteDateTime", () => {
  it("gun.ay.yil bicimi (0 dolgulu)", () => {
    const d = new Date(2026, 0, 3, 9, 5); // 3 Ocak 2026 09:05 yerel
    expect(absoluteDate(d.toISOString())).toBe("03.01.2026");
  });
  it("tarih + saat bicimi", () => {
    const d = new Date(2026, 5, 25, 14, 30);
    expect(absoluteDateTime(d.toISOString())).toBe("25.06.2026 14:30");
  });
  it("gecersiz ISO 'NaN.NaN.NaN' yerine '—' doner", () => {
    expect(absoluteDate("bozuk-tarih")).toBe("—");
    expect(absoluteDateTime("bozuk-tarih")).toBe("—");
    expect(relativeTime("bozuk-tarih", new Date(2026, 5, 25))).toBe("—");
  });
});
