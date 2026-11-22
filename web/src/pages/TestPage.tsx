import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { ErrorBox, Loading } from "../components/common";
import { Icon } from "../components/Icon";
import { QuestCompletedNotice } from "../components/SystemNotice";
import { QuestionCard } from "../components/QuestionCard";
import { shuffledOrder } from "../lib/quiz";

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
      {result?.xp.questCompleted && <QuestCompletedNotice />}

      {c.test.map((question, qi) => (
        <QuestionCard key={`${attempt}-${qi}`} question={question} index={qi} total={c.test.length} order={orders[qi] ?? []}
          picked={answers[qi]} graded={result?.grade.questions[qi]} onPick={(orig) => setAnswers({ ...answers, [qi]: orig })} />
      ))}

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
