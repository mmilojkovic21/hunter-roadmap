import { expect, test } from "@playwright/test";

// Boot ekran (faza 2, stavka 9). Običan `test` iz Playwright-a, bez fixture-a za kratak boot:
// svaki test ima svež pregledač (prazan localStorage), pa je prvo učitavanje „prvo u danu” = puna verzija.
test.describe("boot ekran", () => {
  test("prvi ulazak u danu: OK redovi prate podatke, PRISTUP ODOBREN, pa fokus na sadržaj", async ({ page }) => {
    await page.goto("/");
    const boot = page.locator("#boot");
    await expect(boot).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-boot", "full");
    await expect(boot).toContainText("[ SISTEM ] POVEZIVANJE SA HUNTEROM");

    await expect(page.locator(".boot-row.ok")).toHaveCount(4);
    await expect(boot).toHaveClass(/granted/);

    // Overlay nestaje posle ~4 s (najkraće trajanje pune verzije) i fokus ide na <main>.
    await expect(boot).toHaveCount(0, { timeout: 8000 });
    await expect(page.locator("main")).toBeFocused();
    await expect(page.getByRole("heading", { name: "Dobro došao nazad, Hunteru" })).toBeVisible();
  });

  test("isti dan, ponovno učitavanje: kratka verzija SISTEM SPREMAN", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#boot")).toHaveCount(0, { timeout: 8000 });

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-boot", "short");
    await expect(page.locator("#boot")).toContainText("SISTEM SPREMAN");
    await expect(page.locator("#boot")).toHaveCount(0, { timeout: 2000 });
  });

  test("Esc odmah preskače animaciju", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#boot")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator("#boot")).toHaveCount(0, { timeout: 1500 });
  });

  test("klik odmah preskače animaciju", async ({ page }) => {
    await page.goto("/");
    await page.locator("#boot").click();

    await expect(page.locator("#boot")).toHaveCount(0, { timeout: 1500 });
  });

  test("API nedostupan: greška, pa Pokušaj ponovo kad API proradi", async ({ page }) => {
    await page.route("**/api/**", (route) => route.abort());
    await page.goto("/");

    await expect(page.getByText("[ GREŠKA ] Sistem nedostupan")).toBeVisible({ timeout: 10_000 });
    const retry = page.getByRole("button", { name: "Pokušaj ponovo" });
    await expect(retry).toBeFocused();

    await page.unroute("**/api/**");
    await retry.click();

    await expect(page.locator(".boot-row.ok")).toHaveCount(4);
    await expect(page.locator("#boot")).toHaveCount(0, { timeout: 8000 });
  });

  test("smanjeni pokreti: bez animacije, statična verzija koja nestaje čim stignu podaci", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-boot", "static");
    await expect(page.locator("#boot")).toHaveCount(0, { timeout: 2000 });
  });
});
