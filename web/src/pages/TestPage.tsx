import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { ErrorBox, Loading } from "../components/common";
import { Icon } from "../components/Icon";
import { QuestCompletedNotice } from "../components/SystemNotice";
import { DungeonGate, LevelUp } from "../components/Fx";
import { AnswerPips, QuestionCard } from "../components/QuestionCard";
import { Window } from "../components/Window";
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
      <DungeonGate key={attempt} label={`[ DUNGEON ] POGLAVLJE ${c.id}`} />
      <div className="row">
        <Link className="btn" to={`/chapters/${encodeURIComponent(id)}`}><Icon name="back" /> Napusti dungeon</Link>
      </div>
      {/* Gornji prozor (kanvas „11 · Dungeon test”). Vreme se ne prikazuje: test nema tajmer. */}
      <Window title={`Dungeon · poglavlje ${c.id}`} level={1} glass>
        <div className="dungeon-head">
          <div className="dungeon-id">
            <span className="win-label">{c.regionTitle}</span>
            <h2 className="dungeon-name">{c.title}</h2>
          </div>
          <div className="dungeon-stats">
            <div><span className="win-label">Odgovoreno</span><strong>{answered} / {c.test.length}</strong></div>
            <div><span className="win-label">Prolaz</span><strong>{c.passPct}%</strong></div>
            {c.bestPercent !== null && <div><span className="win-label">Najbolje</span><strong>{c.bestPercent}%</strong></div>}
          </div>
        </div>
        <AnswerPips total={c.test.length} answers={answers} graded={result?.grade.questions} />
      </Window>

      {result && (
        <section className="sys" role="status" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="kicker">[ sistem ] dungeon {result.grade.passed ? "očišćen" : "nije očišćen"}</span>
          <h2 style={{ fontSize: 30 }}>{result.grade.percent}% · {result.grade.correctCount} / {result.grade.total} tačno</h2>
          <span>
            {result.firstPass ? `+${result.xp.xpAwarded} XP` : result.grade.passed ? "Već položeno ranije, bez novog XP-a." : `Za prolaz treba ${c.passPct}%.`}
          </span>
          <div className="row">
            <button type="button" className="btn" onClick={retry}>Ponovi test</button>
            {c.nextId && <Link className="btn primary" to={`/chapters/${encodeURIComponent(c.nextId)}`}>Sledeće poglavlje →</Link>}
          </div>
        </section>
      )}
      {result?.xp.levelUp && <LevelUp level={result.xp.level.level} />}
      {result?.xp.questCompleted && <QuestCompletedNotice />}

      {c.test.map((question, qi) => (
        <QuestionCard key={`${attempt}-${qi}`} question={question} index={qi} total={c.test.length} order={orders[qi] ?? []}
          picked={answers[qi]} graded={result?.grade.questions[qi]} onPick={(orig) => setAnswers({ ...answers, [qi]: orig })} />
      ))}

      {submit.isError && <ErrorBox error={submit.error} />}
      {!result && (
        <div className="row between">
          <span className="win-label">Netačni odgovori idu u slabe tačke · odgovoreno {answered} / {c.test.length}</span>
          <button type="button" className="btn primary" disabled={answered < c.test.length || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Sistem ocenjuje…" : "Predaj test"}
          </button>
        </div>
      )}
    </>
  );
}
