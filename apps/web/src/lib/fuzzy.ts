// Kutuphanesiz fuzzy eslesme skoru (command palette): sorgu karakterleri sirayla geciyorsa
// eslesir; erken/ardisik eslesme daha yuksek skor alir (VS Code hissi icin yeterli).
// Saf fonksiyon — birim test edilebilir (T1).
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      streak++;
      score += 2 + streak; // ardisik eslesme bonusu
    } else {
      streak = 0;
    }
  }
  if (qi < q.length) return 0; // tum karakterler gecmedi
  return score + Math.max(0, 30 - t.length); // kisa metin bonusu
}
