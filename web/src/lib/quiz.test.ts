import { describe, expect, it } from "vitest";
import { heatLevel, shuffledOrder } from "./quiz";

describe("shuffledOrder", () => {
  it("vraća permutaciju svih indeksa", () => {
    for (let n = 1; n <= 6; n++) {
      expect([...shuffledOrder(n)].sort()).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });

  it("je determinističan uz isti random", () => {
    const seq = [0.1, 0.7, 0.3, 0.9];
    const rnd = () => seq.shift() ?? 0;
    expect(shuffledOrder(4, rnd)).toEqual([1, 3, 2, 0]);
  });
});

describe("heatLevel", () => {
  it("raste sa XP-om", () => {
    expect([0, 30, 100, 200, 400].map(heatLevel)).toEqual([0, 1, 2, 3, 4]);
  });
});
