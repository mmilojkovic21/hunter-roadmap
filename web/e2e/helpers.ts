import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";
import pack from "../../packs/fullstack-dotnet/chapters.json" with { type: "json" };
import { splitInlineCode } from "../src/lib/inlineCode";

// Pomoćne funkcije za E2E testove. Tačne odgovore API namerno ne šalje pre predaje, pa ih test
// čita iz samog paketa (isti fajl koji API uvozi), kao što bi ih znao korisnik koji je naučio lekciju.

/**
 * `test` za sve E2E testove osim boot-a: pre svakog učitavanja upiše da je današnji pun boot već prikazan,
 * pa ide kratka verzija (~0,8 s) umesto 4 s, a Playwright sam sačeka da nestane pre klika. Boot ima svoje testove.
 */
export const test = base.extend<{ shortBoot: void }>({
  shortBoot: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        localStorage.setItem("hunter.boot.lastFull", JSON.stringify(today));
      });
      await use();
    },
    { auto: true },
  ],
});
export { expect };

interface PackQuestion { text: string; code: string | null; options: string[]; correct: number }
interface PackChapter { id: string; test: PackQuestion[] }

const chapters = pack as PackChapter[];

// Pitanje se prepoznaje po tekstu I kodu: više pitanja ima isti tekst („Šta ispisuje kod?”) sa drugim kodom.
const key = (text: string, code: string | null) => `${plain(text)}\n${(code ?? "").trim()}`;
// Inline kod (`...`) se na ekranu prikazuje kao <code>, bez backtick-ova (InlineText),
// pa se tekst iz paketa poredi bez njih, isto kao splitInlineCode.
const plain = (s: string) => splitInlineCode(s).map((p) => p.text).join("").trim();
const correctOption = new Map(
  chapters.flatMap((c) => c.test.map((q) => [key(q.text, q.code), plain(q.options[q.correct])] as const)),
);

export const correctAnswers = (chapterId: string) =>
  chapters.find((c) => c.id === chapterId)!.test.map((q) => q.correct);

/** Na stranici testa (poglavlje ili boss) klikne tačnu opciju u svakoj kartici pitanja. */
export async function answerAllCorrectly(page: Page) {
  // Pitanja stižu sa servera (boss ih bira tek na klik), pa se prvo sačeka da se pojave.
  await expect(page.locator("button.option").first()).toBeVisible();
  const cards = page.locator("section.card").filter({ has: page.locator("button.option") });
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const text = await card.locator("h2").innerText();
    const code = (await card.locator("pre").count()) > 0 ? await card.locator("pre").innerText() : null;
    const option = correctOption.get(key(text, code));
    expect(option, `tačan odgovor za: ${text}`).toBeDefined();
    // Opcije su izmešane; poredi se samo tekst opcije (drugi span), ne slovo-oznaka (span.key),
    // jer opcija može da glasi baš „B”, pa bi pretraga po tekstu pogodila i oznaku.
    const buttons = card.locator("button.option");
    const texts = await buttons.evaluateAll((els) =>
      els.map((el) => el.querySelector("span:not(.key)")?.textContent?.trim() ?? ""));
    const index = texts.indexOf(option!);
    expect(index, `opcija „${option}” u pitanju: ${text}`).toBeGreaterThanOrEqual(0);
    await buttons.nth(index).click();
  }
}

/** Očisti poglavlje kroz API (svi koraci + položen test), za pripremu stanja bez klikanja. */
export async function clearChapterViaApi(request: APIRequestContext, chapterId: string) {
  const chapter = await (await request.get(`/api/chapters/${chapterId}`)).json();
  for (const step of chapter.steps as string[]) {
    if (chapter.completed.includes(step)) continue;
    const res = step === "Test"
      ? await request.post(`/api/chapters/${chapterId}/test`, { data: { answers: correctAnswers(chapterId) } })
      : await request.post(`/api/chapters/${chapterId}/steps/${step}`);
    expect(res.ok(), `${chapterId}/${step}`).toBeTruthy();
  }
}

/** Uključi/isključi „Smanji animacije” kroz API (PUT traži ceo objekat podešavanja). */
export async function setReduceMotion(request: APIRequestContext, on: boolean) {
  const settings = await (await request.get("/api/settings")).json();
  const res = await request.put("/api/settings", { data: { ...settings, reduceMotion: on } });
  expect(res.ok()).toBeTruthy();
}
