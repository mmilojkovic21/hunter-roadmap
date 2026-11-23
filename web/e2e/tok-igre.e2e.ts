import { answerAllCorrectly, clearChapterViaApi, expect, test } from "./helpers";

// Ceo tok kroz pravi pregledač, nad svežom bazom (tools/e2e.sh). Koraci se nadovezuju (XP, dnevni zadatak),
// pa testovi u ovom fajlu idu redom. Dnevni zadatak (4 koraka) zavisi od sadržaja paketa, pa test poslednji
// preostali korak čita sa API-ja umesto da ga podrazumeva.
test.describe.serial("tok igre", () => {
  test("lekcija i vežba: +XP iznad dugmeta, pa LEVEL UP", async ({ page }) => {
    await page.goto("/chapters/0.1");

    await page.getByRole("button", { name: "Lekcija pročitana" }).click();
    await expect(page.locator(".fx-float")).toHaveText("+50 XP");
    await expect(page.getByRole("status").filter({ hasText: "+50 XP" }).first()).toBeVisible();

    // Vežba: dugme je aktivno tek kad su štiklirani svi koraci.
    await page.getByRole("tab", { name: "Vežba" }).click();
    const vezba = page.getByRole("button", { name: "Vežba završena" });
    await expect(vezba).toBeDisabled();
    for (const box of await page.getByRole("checkbox").all()) await box.check();
    await vezba.click();

    // 50 + 100 XP = nivo 2.
    const levelUp = page.locator(".levelup");
    await expect(levelUp).toBeVisible();
    await expect(levelUp).toContainText("LEVEL UP");
    await expect(levelUp).toContainText("Nivo 1 → 2");
  });

  test("test poglavlja: kapija ne blokira klikove i sama nestane", async ({ page }) => {
    await page.goto("/chapters/0.1/test");
    await expect(page.locator(".gate")).toBeVisible();

    // Odgovori se kliknu ODMAH, dok kapija još traje: sloj ima pointer-events: none.
    await answerAllCorrectly(page);
    await expect(page.locator(".gate")).toHaveCount(0, { timeout: 3000 });

    await page.getByRole("button", { name: "Predaj test" }).click();
    await expect(page.getByRole("status").filter({ hasText: "dungeon očišćen" })).toBeVisible();
  });

  test("poslednji zadatak dana: poruka sistema DNEVNI ZADATAK ZAVRŠEN", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dnevni zadatak" })).toBeVisible();
    await expect(page.getByText("3/4 ·")).toBeVisible();

    // Poslednji nezavršeni zadatak dana: lekcija ili „Dublje” (oba se završavaju dugmetom na svojoj kartici).
    const before = await (await request.get("/api/status")).json();
    const left = before.dailyQuest.tasks.filter((t: { done: boolean }) => !t.done);
    expect(left).toHaveLength(1);
    const { chapterId, step } = left[0] as { chapterId: string; step: string };
    expect(["Lesson", "Deeper"]).toContain(step);
    await page.goto(`/chapters/${chapterId}`);
    if (step === "Deeper") {
      await page.getByRole("tab", { name: /Dublje/ }).click();
      await page.getByRole("button", { name: "Završeno" }).click();
    } else {
      await page.getByRole("button", { name: "Lekcija pročitana" }).click();
    }

    const notice = page.locator(".notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("DNEVNI ZADATAK ZAVRŠEN");

    await page.goto("/");
    await expect(page.getByText("Zadatak završen! Osvojen 1 slobodan poen.")).toBeVisible();

    // Prozor STATUS: XP i slobodni poeni se odbroje od viđene vrednosti i stanu tačno na vrednost sa API-ja.
    const status = await (await request.get("/api/status")).json();
    await expect(page.locator(".status-xp-val")).toHaveText(`${status.level.xpIntoLevel} / ${status.level.xpForNextLevel}`);
    await expect(page.locator(".status-points strong")).toHaveText(String(status.freePoints));
  });

  test("očišćen region: sjaj na mapi, novi rang, boss gate i DUNGEON CLEARED", async ({ page, request }) => {
    // Sistem pamti šta je korisnik već video (rang, očišćena poglavlja), pa prvo jedna poseta „pre”.
    await page.goto("/");
    await expect(page.getByLabel("Rang E")).toBeVisible();
    await page.goto("/map");
    await expect(page.getByRole("heading", { name: "Mapa veština" })).toBeVisible();

    const map = await (await request.get("/api/map")).json();
    const region0 = map.regions.find((r: { code: string }) => r.code === "0");
    for (const level of region0.levels) for (const c of level.chapters) await clearChapterViaApi(request, c.id);

    // Mapa: novo očišćena poglavlja zasvetle (0.1 je bilo očišćeno i pre, pa ono ne).
    await page.goto("/map?r=0");
    await expect(page.locator(".chapter-card.fx-glow")).toHaveCount(region0.levels.flatMap((l: { chapters: unknown[] }) => l.chapters).length - 1);

    // Status: 9 od 80 poglavlja = 11% = rang D, pa se romb okrene.
    await page.goto("/");
    await expect(page.locator(".rank.fx-rank-up")).toBeVisible();
    await expect(page.getByLabel("Rang D")).toBeVisible();

    // Boss: bljesak na gate-u, ulazak, tačni odgovori, DUNGEON CLEARED sa nagradama.
    await page.goto("/map?r=0");
    await page.getByRole("link", { name: "Uđi u boss gate →" }).click();
    await expect(page.locator(".boss-alarm")).toBeAttached();
    await page.getByRole("button", { name: "Uđi u boss gate" }).click();
    await answerAllCorrectly(page);
    await page.getByRole("button", { name: "Predaj boss test" }).click();

    const cleared = page.locator(".cleared");
    await expect(cleared).toBeVisible();
    await expect(cleared).toContainText("DUNGEON CLEARED");
    await expect(cleared.locator(".cleared-chip").first()).toHaveText("+500 XP");

    await page.goto("/map?r=0");
    await expect(page.getByText("BOSS PORAŽEN ✓")).toBeVisible();
  });
});
