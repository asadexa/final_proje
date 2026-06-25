// datetime-local <-> ISO donusumu YEREL saatte yapilmali; aksi halde UTC'ye kayar
// (orn. TR'de 12:00 secimi 09:00 gorunur). slice(0,16) UTC gosterirdi.
// Saf fonksiyon — birim test edilebilir (T1; gecmiste gercek timezone bug'i cikti).
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
