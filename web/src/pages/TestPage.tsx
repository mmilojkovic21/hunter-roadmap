import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { ErrorBox, Loading } from "../components/common";
import { Icon } from "../components/Icon";
import { KEYS, shuffledOrder } from "../lib/quiz";

export function TestPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["chapter", id], queryFn: () => api.chapter(id) });
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  // Novi redosled opcija za svaki pokušaj (attempt).
  const orders = useMemo(
    () => (q.data?.test ?? []).map((t) => shuffledOrder(t.options.length)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.data?.id, attempt],
  );

  const submit = useMutation({
    mutationFn: () => api.submitTest(id, q.data!.test.map((_, i) => answers[i] ?? -1)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chapter", id] });
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["map"] });
    },
  });

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;
  const c = q.data;
  if (c.test.length === 0) return <div className="empty">Ovo poglavlje nema test. <Link to={`/chapters/${encodeURIComponent(id)}`}>Nazad</Link></div>;

  const result = submit.data;
  const answered = Object.keys(answers).length;
  const retry = () => { setAnswers({}); setAttempt((a) => a + 1); submit.reset(); window.scrollTo(0, 0); };

  return (
    <>
      <div className="row between">
        <Link className="btn" to={`/chapters/${encodeURIComponent(id)}`}><Icon name="back" /> Napusti dungeon</Link>
        <span className="kicker">dungeon · poglavlje {c.id}</span>
      </div>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 className="title">{c.title}</h1>
        <span className="muted">{c.test.length} pitanja · prolaz {c.passPct}% · netačni odgovori idu u slabe tačke</span>
      </header>

      {result && (
        <section className="sys" role="status" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="kicker">[ sistem ] dungeon {result.grade.passed ? "očišćen" : "nije očišćen"}</span>
          <h2 style={{ fontSize: 30 }}>{result.grade.percent}% · {result.grade.correctCount} / {result.grade.total} tačno</h2>
          <span>
            {result.firstPass ? `+${result.xp.xpAwarded} XP` : result.grade.passed ? "Već položeno ranije, bez novog XP-a." : `Za prolaz treba ${c.passPct}%.`}
            {result.xp.levelUp && ` LEVEL UP! Nivo ${result.xp.level.level}.`}
          </span>
          <div className="row">
            <button type="button" className="btn" onClick={retry}>Ponovi test</button>
            {c.nextId && <Link className="btn primary" to={`/chapters/${encodeURIComponent(c.nextId)}`}>Sledeće poglavlje →</Link>}
          </div>
        </section>
      )}

      {c.test.map((question, qi) => {
        const graded = result?.grade.questions[qi];
        return (
          <section key={`${attempt}-${qi}`} className="card" aria-labelledby={`q-${qi}`}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)" }}>PITANJE {qi + 1} / {c.test.length}</span>
            <h2 id={`q-${qi}`} style={{ fontSize: 21, lineHeight: 1.35 }}>{question.text}</h2>
            {question.code && <pre className="prose" style={{ margin: 0 }}><code>{question.code}</code></pre>}
            <div role="radiogroup" aria-labelledby={`q-${qi}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {orders[qi]?.map((orig, pos) => {
                const picked = answers[qi] === orig;
                const cls = graded ? (orig === graded.correct ? "right" : picked ? "wrong" : "") : picked ? "picked" : "";
                return (
                  <button key={orig} type="button" role="radio" aria-checked={picked} className={`option ${cls}`}
                    disabled={!!result} onClick={() => setAnswers({ ...answers, [qi]: orig })}>
                    <span className="key">{KEYS[pos]}</span>
                    <span style={{ flex: 1 }}>{question.options[orig]}</span>
                    {graded && orig === graded.correct && <span className="state-Done" style={{ fontSize: 13, fontWeight: 700 }}>Tačno</span>}
                    {graded && picked && !graded.isCorrect && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--bad)" }}>Tvoj odgovor</span>}
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
      })}

      {submit.isError && <ErrorBox error={submit.error} />}
      {!result && (
        <div className="row between">
          <span className="muted">Odgovoreno {answered} / {c.test.length}</span>
          <button type="button" className="btn primary" disabled={answered < c.test.length || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Sistem ocenjuje…" : "Predaj test"}
          </button>
        </div>
      )}
    </>
  );
}
