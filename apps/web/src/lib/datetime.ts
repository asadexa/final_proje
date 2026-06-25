// datetime-local <-> ISO donusumu YEREL saatte yapilmali; aksi halde UTC'ye kayar
// (orn. TR'de 12:00 secimi 09:00 gorunur). slice(0,16) UTC gosterirdi.
// Saf fonksiyon — birim test edilebilir (T1; gecmiste gercek timezone bug'i cikti).
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Mutlak tarih (gun.ay.yil) — relative esiginden eski tarihler ve hover title icin.
export function absoluteDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Tam tarih + saat (icerik listesi hover title'i).
export function absoluteDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${absoluteDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Gecmis bir ISO tarihi Turkce relative ifadeye cevirir ("2 saat önce", "Dün", "3 gün önce").
// 4 haftadan eskisi mutlak tarihe duser. now parametresi saf/test-edilebilirlik icin (varsayilan: simdi).
export function relativeTime(iso: string, now: Date = new Date()): string {
  const sec = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (sec < 45) return "az önce";
  if (min < 60) return `${min} dk önce`;
  if (hour < 24) return `${hour} saat önce`;
  if (day === 1) return "Dün";
  if (day < 7) return `${day} gün önce`;
  if (day < 28) return `${Math.floor(day / 7)} hafta önce`;
  return absoluteDate(iso);
}
