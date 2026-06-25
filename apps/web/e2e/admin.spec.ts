import { expect, test, type Page } from "@playwright/test";

// Kritik admin akislari (T1 — login -> yayinla + Serit A oturum garantileri).
// On kosul: canli stack (web:3000 + api:4000) + seed admin (admin@kron.local / Admin123!).
// NOT: bu spec canli DOM'a karsi calistirilmadi; secicilerin kucuk ayar gerektirebilecegi
// yerlere yorum dusuldu (canli QA'da netlesir).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kron.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin123!";

async function login(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("E-posta").fill(ADMIN_EMAIL);
  await page.getByLabel("Parola").fill(ADMIN_PASSWORD);
  // Buton metni kaynakta ASCII: "Giris Yap" (diakritiksiz).
  await page.getByRole("button", { name: "Giris Yap" }).click();
  await page.waitForURL("**/admin");
}

test("login -> icerik olustur -> kaydet -> yayinla", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: "+ Yeni içerik" }).click();
  await page.waitForURL("**/admin/entries/new");

  const slug = `e2e-${Date.now()}`;
  // Yeni-icerik formunda label'lar htmlFor ile bagli degil -> placeholder ile bul.
  await page.getByPlaceholder("İçerik başlığı").fill("E2E Test İçeriği");
  await page.getByPlaceholder("ornek-slug").fill(slug);
  await page.getByRole("button", { name: "Oluştur ve düzenle" }).click();
  await page.waitForURL(/\/admin\/entries\/[^/]+$/);

  // Durum select'i "Durum" etiketinin yaninda; htmlFor baglantisi yoksa rol+yakinlik ile bulunur.
  await page.locator("select").first().selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Kaydedildi")).toBeVisible();
});

test("reload sonrasi oturum korunur (in-memory token + sessiz refresh)", async ({ page }) => {
  await login(page);
  // A2: accessToken localStorage'da DEGIL (in-memory) — eski anahtar bulunmamali.
  expect(await page.evaluate(() => localStorage.getItem("kron_admin_token"))).toBeNull();
  await page.reload();
  // refresh cookie ile sessizce geri gelinir; login'e atilmamali (A2 + useAdminGuard).
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "İçerikler" })).toBeVisible();
});

test("logout -> back-button korumali sayfayi gosteremez (BFCache stale token kapandi)", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Çıkış" }).click();
  await page.waitForURL("**/admin/login");
  await page.goBack();
  // pageshow+persisted -> revalidateSession (token'a guvenmez) -> refresh cookie yok -> login.
  await expect(page).toHaveURL(/\/admin\/login/);
});
