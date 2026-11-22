import { defineConfig } from "@playwright/test";

// E2E testovi (vodič, pogl. 29): pravi pregledač nad celom aplikacijom (nginx → API → Postgres).
// Pokreću se kroz tools/e2e.sh, koji podiže svežu instancu na 8099. Nisu deo `npm test` (sporiji su i traže Docker).
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts", // ne *.spec.ts/*.test.ts, da ih Vitest ne pokupi kao unit testove
  fullyParallel: false,
  workers: 1, // svi testovi dele jednu bazu, pa idu redom
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:8099",
    channel: "chrome", // instalirani Chrome, bez preuzimanja Playwright pregledača
    // SLOWMO=500 usporava svaku radnju (ms), da se uz --headed može pratiti šta test radi.
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) },
    trace: "retain-on-failure",
  },
});
