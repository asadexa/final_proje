import { defineConfig, devices } from "@playwright/test";

// Admin paneli E2E (Playwright). Bu dizin kok tsc/eslint/vitest kapsami DISINDADIR (tsconfig
// exclude + eslint globalIgnores) — ayri runner.
//
// Calistirma:
//   1) npm install            (apps/web — @playwright/test devDep'i ceker)
//   2) npx playwright install  (tarayicilari indirir, tek sefer)
//   3) canli stack: docker compose up -d  (web:3000 + api:4000 + seed admin)
//   4) npm run test:e2e
export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:3000",
    headless: true,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
