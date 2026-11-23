import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

// Kazneni zadatak (Sistem 2.0, kanvas „13 · Kazneni zadatak”). Sveža E2E baza nema „juče”, pa test podmeće
// odgovor /api/status sa aktivnom kaznom (route), a preskakanje odgovara lažnim rezultatom. Pravilo preskakanja
// (niz se prekida, zadaci ponavljanja nestaju) proveravaju API testovi; ovde se proverava prozor.

async function withPenalty(page: Page) {
  await page.route("**/api/status", async (route) => {
    const status = await (await route.fetch()).json();
    const review = { chapterId: "0.1", chapterTitle: "Kako radi računar", step: "Test", minutes: 5, xp: 0, done: false, review: true };
    status.dailyQuest = { ...status.dailyQuest, penalty: true, tasks: [review, ...status.dailyQuest.tasks] };
    await route.fulfill({ json: status });
  });
}

test.describe("kazneni zadatak", () => {
  // Status se osvežava i posle prelaska na drugu stranicu; zahtev koji je još u letu ne sme da obori test.
  test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "ignoreErrors" }); });

  test("crveni prozor: Preskoči prekida niz i prikazuje poruku sistema", async ({ page }) => {
    await withPenalty(page);
    let skipped = false;
    await page.route("**/api/penalty/skip", (route) => {
      skipped = true;
      return route.fulfill({ json: { streakBefore: 3, questCompleted: false } });
    });
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: "Kazneni zadatak" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Ponovi test: Kako radi računar");
    await expect(dialog.getByRole("button", { name: "Prihvati" })).toBeFocused();

    await dialog.getByRole("button", { name: "Preskoči · niz se prekida" }).click();
    await expect(dialog.getByRole("status")).toContainText("NIZ PREKINUT · 3 → 0");
    expect(skipped).toBe(true);

    await dialog.getByRole("button", { name: "U redu" }).click();
    await expect(dialog).toBeHidden();
  });

  test("Esc zatvara prozor za danas; tabla ga ponovo otvara, a Prihvati vodi na ponavljanje", async ({ page }) => {
    await withPenalty(page);
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Kazneni zadatak" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByRole("heading", { name: "[ KAZNA ] KAZNENI ZADATAK AKTIVAN" })).toBeVisible();
    await expect(dialog).toBeHidden();   // isti dan: ne otvara se sam ponovo

    await page.getByRole("button", { name: "Otvori prozor kazne" }).click();
    await dialog.getByRole("button", { name: "Prihvati" }).click();
    await expect(page).toHaveURL(/\/chapters\/0\.1\/test$/);
  });
});
