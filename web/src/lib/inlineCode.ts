/**
 * Deli tekst pitanja na obične delove i delove u `backtick-ovima` (kod).
 * Pitanja i opcije nisu pun Markdown, pa nema potrebe za react-markdown-om u test i boss
 * chunk-u; dovoljno je prepoznati inline kod. Neuparen backtick ostaje doslovno.
 */
export interface TextPart { text: string; code: boolean }

export function splitInlineCode(s: string): TextPart[] {
  const parts: TextPart[] = [];
  let rest = s;
  for (;;) {
    const open = rest.indexOf("`");
    const close = open < 0 ? -1 : rest.indexOf("`", open + 1);
    if (close < 0) break;
    if (open > 0) parts.push({ text: rest.slice(0, open), code: false });
    if (close > open + 1) parts.push({ text: rest.slice(open + 1, close), code: true });
    rest = rest.slice(close + 1);
  }
  if (rest) parts.push({ text: rest, code: false });
  return parts;
}
