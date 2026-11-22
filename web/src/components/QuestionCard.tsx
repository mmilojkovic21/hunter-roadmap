import type { PublicQuestion, QuestionResult } from "../api";
import { KEYS } from "../lib/quiz";

/**
 * Jedno pitanje testa sa opcijama u izmešanom redosledu (`order`) i, posle predaje, ocenom.
 * Koriste ga test poglavlja i boss test. `onPick` uvek dobija indeks u ORIGINALNOM redosledu,
 * jer ga server tako ocenjuje (lib/quiz.ts).
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
  return (
    <section className="card" aria-labelledby={id}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)" }}>PITANJE {index + 1} / {total}</span>
      <h2 id={id} style={{ fontSize: 21, lineHeight: 1.35 }}>{question.text}</h2>
      {question.code && <pre className="prose" style={{ margin: 0 }}><code>{question.code}</code></pre>}
      <div role="radiogroup" aria-labelledby={id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {order.map((orig, pos) => {
          const isPicked = picked === orig;
          const cls = graded ? (orig === graded.correct ? "right" : isPicked ? "wrong" : "") : isPicked ? "picked" : "";
          return (
            <button key={orig} type="button" role="radio" aria-checked={isPicked} className={`option ${cls}`}
              disabled={!!graded} onClick={() => onPick(orig)}>
              <span className="key">{KEYS[pos]}</span>
              <span style={{ flex: 1 }}>{question.options[orig]}</span>
              {graded && orig === graded.correct && <span className="state-Done" style={{ fontSize: 13, fontWeight: 700 }}>Tačno</span>}
              {graded && isPicked && !graded.isCorrect && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--bad)" }}>Tvoj odgovor</span>}
            </button>
          );
        })}
      </div>
      {graded && (
        <div className="card" style={{ background: graded.isCorrect ? "#0f2620" : "#24121a", borderColor: graded.isCorrect ? "#2f8f73" : "#a0445f" }}>
          <strong style={{ color: graded.isCorrect ? "var(--ok)" : "var(--bad)" }}>{graded.isCorrect ? "Tačno." : "Netačno."}</strong>
          <span style={{ lineHeight: 1.55 }}>{graded.why}</span>
        </div>
      )}
    </section>
  );
}
