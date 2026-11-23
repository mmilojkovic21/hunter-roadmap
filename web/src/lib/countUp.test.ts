import { describe, expect, it } from "vitest";
import { COUNT_MS, countUpAt } from "./countUp";

describe("countUpAt", () => {
  it("pre početka (kašnjenje) prikazuje početnu vrednost", () => {
    expect(countUpAt(80, 130, -200)).toBe(80);
    expect(countUpAt(80, 130, 0)).toBe(80);
  });

  it("na kraju i posle kraja prikazuje tačno ciljnu vrednost", () => {
    expect(countUpAt(80, 130, COUNT_MS)).toBe(130);
    expect(countUpAt(80, 130, COUNT_MS * 3)).toBe(130);
  });

  it("ease-out: na polovini vremena je prešao više od pola puta", () => {
    const mid = countUpAt(0, 100, COUNT_MS / 2);
    expect(mid).toBeGreaterThan(50);
    expect(mid).toBeLessThan(100);
  });

  it("radi i unazad (npr. potrošen slobodan poen) i daje cele brojeve", () => {
    const v = countUpAt(3, 1, COUNT_MS / 3);
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeLessThanOrEqual(3);
    expect(v).toBeGreaterThanOrEqual(1);
  });
});
