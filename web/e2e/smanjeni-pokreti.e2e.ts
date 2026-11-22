import { expect, test } from "@playwright/test";
import { setReduceMotion } from "./helpers";

// Uz smanjene pokrete (sistemsko podešavanje ILI podešavanje u aplikaciji) dekor nestaje:
// kapija, bljesak, +XP. Sadržaj ostaje dostupan. Pravilo iz CLAUDE.md, stavka 8.
test.describe.serial("smanjeni pokreti", () => {
  test("sistemsko prefers-reduced-motion: kapija se ne prikazuje", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/chapters/0.2/test");

    await expect(page.getByRole("heading", { name: "Promenljive i tipovi" })).toBeVisible();
    await expect(page.locator(".gate")).toBeHidden();
  });

  test("podešavanje „Smanji animacije”: data-motion=reduce i bez kapije i bljeska", async ({ page, request }) => {
    await setReduceMotion(request, true);
    try {
      await page.goto("/chapters/0.2/test");
      await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
      await expect(page.locator(".gate")).toBeHidden();

      await page.goto("/boss/0");
      await expect(page.getByText("[ UPOZORENJE ] BOSS GATE")).toBeVisible();
      await expect(page.locator(".boss-alarm")).toBeHidden();
    } finally {
      await setReduceMotion(request, false);
    }
  });
});
