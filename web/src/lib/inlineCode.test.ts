import { describe, expect, it } from "vitest";
import { splitInlineCode } from "./inlineCode";

describe("splitInlineCode", () => {
  it("izdvaja kod između backtick-ova", () => {
    expect(splitInlineCode("Šta ako `GetHashCode` vraća `0`?")).toEqual([
      { text: "Šta ako ", code: false },
      { text: "GetHashCode", code: true },
      { text: " vraća ", code: false },
      { text: "0", code: true },
      { text: "?", code: false },
    ]);
  });

  it("tekst bez koda ostaje jedan deo", () => {
    expect(splitInlineCode("Običan tekst")).toEqual([{ text: "Običan tekst", code: false }]);
  });

  it("neuparen backtick ostaje doslovno", () => {
    expect(splitInlineCode("`a` i ` b")).toEqual([
      { text: "a", code: true },
      { text: " i ` b", code: false },
    ]);
  });

  it("prazan string daje prazan niz", () => {
    expect(splitInlineCode("")).toEqual([]);
  });
});
