// Brojke koje se odbrojavaju do nove vrednosti (Sistem 2.0, kanvas „9 · Sistem 2.0”: ~0,9 s, ease-out).
// Čista funkcija, da se vreme testira bez pregledača; hook je u components/Fx.tsx.

export const COUNT_MS = 900;

/** Brzo na početku, sporo pred kraj: kao brojač koji „stiže” do vrednosti. */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Vrednost brojača posle `elapsedMs` (može biti negativno dok traje kašnjenje: tada je to početna vrednost).
 * Celobrojna, jer se prikazuju XP, nivo i poeni; na kraju je tačno `to`.
 */
export function countUpAt(from: number, to: number, elapsedMs: number, durationMs = COUNT_MS): number {
  if (elapsedMs <= 0) return from;
  if (elapsedMs >= durationMs) return to;
  return Math.round(from + (to - from) * easeOutCubic(elapsedMs / durationMs));
}
