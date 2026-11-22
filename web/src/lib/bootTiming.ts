// Vremena boot ekrana (dizajn kanvas „8 · Učitavanje aplikacije”), kao čiste funkcije da bi se testirala.
// Sve je u ms od početka učitavanja stranice. Usklađeno sa CSS-om u index.html.

export type BootMode = "full" | "short" | "static";

/** Kada se pojavljuje „OK” za red i (0–3) u punoj verziji: 1,2 s, pa na svakih 0,3 s. */
export const okAt = (row: number) => 1200 + row * 300;

/** Kada najranije iskače „PRISTUP ODOBREN”. */
export const GRANT_AT = 2650;

/** Koliko natpis ostaje na ekranu (uz jedan bljesak) pre zatvaranja. */
export const GRANT_HOLD = 1350;

/** Najkraće trajanje po verziji, i kad su podaci odmah tu. */
export const MIN_MS: Record<BootMode, number> = { full: GRANT_AT + GRANT_HOLD, short: 450, static: 0 };

/** Koliko traje zatvaranje (CSS .boot-done) pre uklanjanja iz DOM-a. */
export const CLOSE_MS: Record<BootMode, number> = { full: 800, short: 350, static: 150 };

/** Kašnjenje za animaciju „OK”: ako je odgovor stigao pre nego što se red pojavio, čeka red; inače odmah. */
export const okDelay = (row: number, elapsed: number) => Math.max(0, okAt(row) - elapsed);

/**
 * Kada (od sada) počinje zatvaranje, kad su svi podaci stigli u trenutku `elapsed`:
 * ne pre najkraćeg trajanja, a u punoj verziji natpis „PRISTUP ODOBREN” mora da stoji GRANT_HOLD.
 */
export function closeIn(mode: BootMode, elapsed: number): number {
  if (mode !== "full") return Math.max(0, MIN_MS[mode] - elapsed);
  const grantShownAt = Math.max(GRANT_AT, elapsed);
  return Math.max(MIN_MS.full, grantShownAt + GRANT_HOLD) - elapsed;
}
