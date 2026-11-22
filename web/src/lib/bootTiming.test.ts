import { describe, expect, it } from "vitest";
import { closeIn, okDelay } from "./bootTiming";

describe("okDelay", () => {
  it("brz odgovor čeka da se red pojavi", () => {
    expect(okDelay(0, 300)).toBe(900); // red 0 dobija OK u 1200 ms
    expect(okDelay(3, 0)).toBe(2100);
  });

  it("spor odgovor dobija OK odmah", () => {
    expect(okDelay(1, 5000)).toBe(0);
  });
});

describe("closeIn", () => {
  it("puna verzija sa brzim podacima traje 4 s", () => {
    expect(closeIn("full", 500)).toBe(3500);
  });

  it("puna verzija sa sporim podacima drži PRISTUP ODOBREN 1,35 s posle dolaska podataka", () => {
    expect(closeIn("full", 6000)).toBe(1350);
  });

  it("kratka verzija ne traje kraće od 0,45 s, a ne čeka ako su podaci kasnili", () => {
    expect(closeIn("short", 100)).toBe(350);
    expect(closeIn("short", 900)).toBe(0);
  });

  it("statična verzija (smanjeni pokreti) zatvara čim stignu podaci", () => {
    expect(closeIn("static", 50)).toBe(0);
  });
});
