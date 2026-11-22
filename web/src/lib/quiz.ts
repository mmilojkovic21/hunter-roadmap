// Mešanje opcija pri svakom pokušaju testa, da se ne pamte pozicije.
// Server uvek dobija indeks u ORIGINALNOM redosledu.

/** Fisher–Yates: vraća permutaciju indeksa 0..n-1 (random se može zameniti u testu). */
export function shuffledOrder(n: number, random: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export const KEYS = ["A", "B", "C", "D", "E", "F"];

export const STEP_LABEL: Record<string, string> = {
  Lesson: "Lekcija",
  Deeper: "Dublje",
  Exercise: "Vežba",
  Test: "Test",
};

/** Nivo boje za mapu aktivnosti (0–4) iz XP-a tog dana. */
export function heatLevel(xp: number): number {
  if (xp <= 0) return 0;
  if (xp < 60) return 1;
  if (xp < 150) return 2;
  if (xp < 250) return 3;
  return 4;
}
