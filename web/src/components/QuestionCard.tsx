import type { PublicQuestion, QuestionResult } from "../api";
import { KEYS } from "../lib/quiz";
import { InlineText } from "./InlineText";

/**
 * Jedno pitanje testa sa opcijama u izmešanom redosledu (`order`) i, posle predaje, ocenom.
 * Koriste ga test poglavlja i boss test. `onPick` uvek dobija indeks u ORIGINALNOM redosledu,
 * jer ga server tako ocenjuje (lib/quiz.ts). Izgled: Sistem 2.0, kanvas „11 · Dungeon test”.
 */
export function QuestionCard({ question, index, total, order, picked, graded, onPick }: {
  question: PublicQuestion;
  index: number;
  total: number;
  order: number[];
  picked: number | undefined;
  graded: QuestionResult | undefined;
  onPick: (original: number) => void;
}) {
  const id = `q-${index}`;
  // Slovo tačne opcije onako kako je korisnik video (opcije su izmešane).
  const correctKey = graded ? KEYS[order.indexOf(graded.correct)] : "";
  return (
    <section className="card glass q-card" aria-labelledby={id}>
      <span className="win-label">Pitanje {index + 1} / {total}</span>
      <h2 id={id} className="q-text"><InlineText text={question.text} /></h2>
      {question.code && <pre className="prose q-code"><code>{question.code}</code></pre>}
      <div role="radiogroup" aria-labelledby={id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {order.map((orig, pos) => {
          const isPicked = picked === orig;
          const cls = graded ? (orig === graded.correct ? "right" : isPicked ? "wrong" : "") : isPicked ? "picked" : "";
          return (
            <button key={orig} type="button" role="radio" aria-checked={isPicked} className={`option ${cls}`}
              disabled={!!graded} onClick={() => onPick(orig)}>
              <span className="key">{KEYS[pos]}</span>
              <span style={{ flex: 1 }}><InlineText text={question.options[orig]} /></span>
              {graded && orig === graded.correct && <strong className="opt-mark">Tačno</strong>}
              {graded && isPicked && !graded.isCorrect && <strong className="opt-mark">Tvoj odgovor</strong>}
            </button>
          );
        })}
      </div>
      {graded && (
        <div className={`q-feedback${graded.isCorrect ? " ok" : " bad"}`}>
          <strong>{graded.isCorrect ? "[ SISTEM ] TAČNO" : `[ SISTEM ] NETAČNO · TAČAN ODGOVOR: ${correctKey}`}</strong>
          <span><InlineText text={graded.why} /></span>
        </div>
      )}
    </section>
  );
}

/**
 * Segmentna traka napretka testa: jedan segment po pitanju. Pre predaje svetli odgovoreno,
 * posle predaje zeleno/crveno po pitanju. Samo slika; broj odgovorenih je i tekstom pored.
 */
export function AnswerPips({ total, answers, graded }: {
  total: number;
  answers: Record<number, number>;
  graded: QuestionResult[] | undefined;
}) {
  return (
    <div className="pips" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }, (_, i) => {
        const g = graded?.[i];
        const cls = g ? (g.isCorrect ? "ok" : "bad") : answers[i] !== undefined ? "on" : "";
        return <span key={i} className={cls} />;
      })}
    </div>
  );
}
