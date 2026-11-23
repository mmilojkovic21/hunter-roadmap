import { splitInlineCode } from "../lib/inlineCode";

/** Tekst sa `inline kodom` (pitanja, opcije, objašnjenja, slabe tačke). */
export function InlineText({ text }: { text: string }) {
  return <>{splitInlineCode(text).map((p, i) => (p.code ? <code key={i}>{p.text}</code> : p.text))}</>;
}
