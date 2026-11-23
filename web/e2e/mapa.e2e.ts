import { expect, test } from "./helpers";

// Mapa veština u Sistemu 2.0: pločica poglavlja bira šta se vidi u prozoru DETALJI, a ulazak ide preko dugmeta.
// Samo čita (ne menja napredak), pa ne zavisi od redosleda ostalih testova.
test("mapa: izbor poglavlja prikazuje korake sa XP-om u DETALJIMA, pa „Uđi u gate” otvara poglavlje", async ({ page }) => {
  await page.goto("/map?r=0");
  await expect(page.getByRole("tab", { selected: true })).toContainText("Programiranje od nule");

  const tile = page.getByRole("button", { name: /Promenljive i tipovi/ });
  await tile.click();
  await expect(tile).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/c=0\.2/);

  const details = page.getByRole("complementary", { name: "Detalji poglavlja" });
  await expect(details).toContainText("Poglavlje 0.2");
  await expect(details).toContainText("Lekcija · +50 XP");

  await details.getByRole("link", { name: /Uđi u gate|Ponovi poglavlje/ }).click();
  await expect(page).toHaveURL(/\/chapters\/0\.2$/);
  await expect(page.getByRole("heading", { name: "Promenljive i tipovi" })).toBeVisible();
});
