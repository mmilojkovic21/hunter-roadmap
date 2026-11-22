import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { ErrorBox, Loading } from "../components/common";
import { Icon } from "../components/Icon";
import { QuestionCard } from "../components/QuestionCard";
import { LevelUp, RegionCleared } from "../components/Fx";
import { shuffledOrder } from "../lib/quiz";

/**
 * Boss test regiona: „BOSS GATE” ekran, pa pitanja koja je izabrao server (POST /regions/{code}/boss),
 * pa ocena (POST /boss/{attemptId}). Svaki novi pokušaj donosi nova nasumična pitanja.
 */
export function BossPage() {
  const { code = "" } = useParams();
  const qc = useQueryClient();
  const map = useQuery({ queryKey: ["map"], queryFn: api.map });
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const start = useMutation({ mutationFn: () => api.startBoss(code) });
  const boss = start.data;
  const submit = useMutation({
    mutationFn: () => api.submitBoss(boss!.attemptId, boss!.questions.map((_, i) => answers[i] ?? -1)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["map"] });
      qc.invalidateQueries({ queryKey: ["status"] });
    },
  });

  // Opcije se mešaju jednom po pokušaju; server i dalje dobija indekse u originalnom redosledu.
  const orders = useMemo(() => (boss?.questions ?? []).map((q) => shuffledOrder(q.options.length)), [boss]);

  if (map.isPending) return <Loading />;
  if (map.isError) return <ErrorBox error={map.error} />;
  const region = map.data.regions.find((r) => r.code === code);
  if (!region) return <div className="empty">Region ne postoji. <Link to="/map">Nazad na mapu</Link></div>;

  const result = submit.data;
  const answered = Object.keys(answers).length;
  const again = () => { setAnswers({}); submit.reset(); start.reset(); window.scrollTo(0, 0); };

  return (
    <>
      <div className="row between">
        <Link className="btn" to={`/map?r=${encodeURIComponent(code)}`}><Icon name="back" /> Napusti boss gate</Link>
        <span className="kicker">boss · region {region.code}</span>
      </div>

      {!boss && (
        <section className="boss-gate" aria-labelledby="gate-h">
          <i className="boss-alarm" aria-hidden="true" />
          <span className="boss-warn">[ UPOZORENJE ] BOSS GATE</span>
          <h1 id="gate-h" className="boss-name">{region.title}</h1>
          <div className="boss-hp" aria-hidden="true"><span /></div>
          <span className="boss-meta">
            {region.bossQuestions} pitanja iz svih poglavlja · prolaz {map.data.bossPassPct}% · nagrada +{map.data.bossXp} XP
          </span>
          {region.boss === "Locked"
            ? <span className="boss-meta">Gate je zatvoren: prvo očisti sva poglavlja regiona.</span>
            : (
              <button type="button" className="btn boss-btn" disabled={start.isPending} onClick={() => start.mutate()}>
                {start.isPending ? "Gate se otvara…" : region.boss === "Cleared" ? "Izazovi bossa ponovo" : "Uđi u boss gate"}
              </button>
            )}
          {start.isError && <ErrorBox error={start.error} />}
        </section>
      )}

      {boss && (
        <>
          <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 className="title">Boss: {boss.regionTitle}</h1>
            <span className="muted">{boss.questions.length} pitanja · prolaz {boss.passPct}% · prvi prolaz +{boss.xpReward} XP</span>
          </header>

          {result?.firstClear && (
            <RegionCleared title={boss.regionTitle}
              rewards={[`+${result.xp.xpAwarded} XP`, `Region ${boss.regionCode} ✓`, ...(result.xp.levelUp ? [`Nivo ${result.xp.level.level}`] : [])]} />
          )}
          {result?.xp.levelUp && <LevelUp level={result.xp.level.level} />}
          {result && (
            <section className={`sys${result.grade.passed ? "" : " boss-lost"}`} role="status" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="kicker">[ sistem ] {result.grade.passed ? "dungeon cleared · boss poražen" : "boss je preživeo"}</span>
              <h2 style={{ fontSize: 30 }}>{result.grade.percent}% · {result.grade.correctCount} / {result.grade.total} tačno</h2>
              <span>
                {result.firstClear ? `+${result.xp.xpAwarded} XP. Region je očišćen.`
                  : result.grade.passed ? "Boss je ponovo poražen; XP za ovaj region je već osvojen."
                  : `Za prolaz treba ${boss.passPct}%. Novi pokušaj donosi nova pitanja.`}
              </span>
              <div className="row">
                <button type="button" className="btn" onClick={again}>Novi pokušaj</button>
                <Link className="btn primary" to={`/map?r=${encodeURIComponent(code)}`}>Nazad na mapu</Link>
              </div>
            </section>
          )}

          {boss.questions.map((question, qi) => (
            <QuestionCard key={`${boss.attemptId}-${qi}`} question={question} index={qi} total={boss.questions.length}
              order={orders[qi] ?? []} picked={answers[qi]} graded={result?.grade.questions[qi]}
              onPick={(orig) => setAnswers({ ...answers, [qi]: orig })} />
          ))}

          {submit.isError && <ErrorBox error={submit.error} />}
          {!result && (
            <div className="row between">
              <span className="muted">Odgovoreno {answered} / {boss.questions.length}</span>
              <button type="button" className="btn primary" disabled={answered < boss.questions.length || submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? "Sistem ocenjuje…" : "Predaj boss test"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
