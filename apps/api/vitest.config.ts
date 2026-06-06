import { defineConfig } from "vitest/config";

// Entegrasyon testleri calisan stack'e (docker compose up) HTTP ile baglanir.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 15000,
  },
});
