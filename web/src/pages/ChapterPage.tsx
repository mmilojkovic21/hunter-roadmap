import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ChapterView, type Step, type XpResult } from "../api";
import { ErrorBox, Loading, STATUS_LABEL } from "../components/common";
import { Markdown } from "../components/Markdown";
import { Icon } from "../components/Icon";
import { QuestCompletedNotice } from "../components/SystemNotice";
import { LevelUp, XpFloat } from "../components/Fx";
import { Window } from "../components/Window";
import { STEP_LABEL } from "../lib/quiz";

// Poglavlje u Sistemu 2.0 (kanvas „12 · Poglavlje”): gornji prozor sa koracima kao sistemskim karticama,
// sadržaj koraka u staklenom panelu, desno prozor NAGRADE. Test nije zaključan (odluka iz faze 2), pa je
// njegova kartica samo ulaz u dungeon.

type Tab = "Lesson" | "Deeper" | "Exercise" | "Test" | "Cards" | "Sources";

export function ChapterPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["chapter", id], queryFn: () => api.chapter(id) });
  const [tab, setTab] = useState<Tab>("Lesson");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  // `n` raste za svaki osvojen korak, pa „+XP” animacija krene iznova i za isti korak dvaput zaredom.
  const [reward, setReward] = useState<{ xp: XpResult; step: Step; n: number } | null>(null);

  const complete = useMutation({
    mutationFn: (step: Step) => api.completeStep(id, step),
    onSuccess: (r, step) => {
      setReward((old) => (r.xpAwarded > 0 ? { xp: r, step, n: (old?.n ?? 0) + 1 } : null));
      qc.invalidateQueries({ queryKey: ["chapter", id] });
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["map"] });
    },
  });

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;
  const c = q.data;
  const isDone = (s: Step) => c.completed.includes(s);
  const xpOf = (s: Step) => c.stepXp[c.steps.indexOf(s)] ?? 0;
  const exercise = c.exercise;
  const exerciseCount = exercise ? (isDone("Exercise") ? exercise.steps.length : exercise.steps.filter((_, i) => checked[i]).length) : 0;
  const allChecked = exercise ? exercise.steps.every((_, i) => checked[i]) : false;
  const xpEarned = c.steps.filter(isDone).reduce((sum, s) => sum + xpOf(s), 0);
  const xpTotal = c.stepXp.reduce((a, b) => a + b, 0);

  // Oznaka na kartici koraka: ✓ +XP kad je urađen, [x/N] za vežbu u toku, +XP za ostale.
  const mark = (s: Step) => {
    if (isDone(s)) return { text: s === "Test" ? `✓ ${c.bestPercent}%` : `✓ +${xpOf(s)}`, cls: "done" };
    if (s === "Exercise" && exercise) return { text: `[${exerciseCount}/${exercise.steps.length}]`, cls: "warn" };
    return { text: `+${xpOf(s)} XP`, cls: "" };
  };
  const tabs: { key: Tab; label: string; mark?: { text: string; cls: string } }[] = [
    ...c.steps.map((s) => ({ key: s as Tab, label: STEP_LABEL[s], mark: mark(s) })),
    ...(c.cards.length > 0 ? [{ key: "Cards" as Tab, label: "Pitanja sa intervjua", mark: { text: `${c.cards.length} kartica`, cls: "" } }] : []),
    ...(c.sources.length > 0 ? [{ key: "Sources" as Tab, label: "Izvori", mark: { text: `${c.sources.length}`, cls: "" } }] : []),
  ];

  const doneButton = (step: Step, label: string, disabled = false) => (
    <span className="fx-anchor">
      {isDone(step)
        ? <span className="state-Done" style={{ fontWeight: 600 }}><Icon name="check" /> {STEP_LABEL[step]} završena</span>
        : <button type="button" className="btn primary" disabled={disabled || complete.isPending} onClick={() => complete.mutate(step)}>{label}</button>}
      {reward?.step === step && <XpFloat key={reward.n} xp={reward.xp.xpAwarded} />}
    </span>
  );

  return (
    <>
      <div className="row">
        <Link to="/map" className="btn"><Icon name="back" /> Mapa</Link>
      </div>

      <Window title={`Poglavlje ${c.id}`} level={1} glass>
        <div className="chapter-head">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 className="chapter-name">{c.title}</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {c.regionTitle} · {c.level} · ~{c.minutes} min · {STATUS_LABEL[c.status]}
            </span>
            {c.subtitle && <span className="muted" style={{ fontSize: 14 }}>{c.subtitle}</span>}
          </div>
          <span className="chapter-xp">NAGRADA: {xpEarned} / {xpTotal} XP</span>
        </div>
        <div className="step-tabs" role="tablist" aria-label="Koraci poglavlja">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" className="step-tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
              <span className="step-tab-name">{t.label}</span>
              {t.mark && <span className={`step-tab-mark ${t.mark.cls}`}>{t.mark.text}</span>}
            </button>
          ))}
        </div>
      </Window>

      {reward && (
        <div className="sys" role="status">
          <span className="kicker">[ sistem ] +{reward.xp.xpAwarded} XP</span>
        </div>
      )}
      {reward?.xp.levelUp && <LevelUp key={reward.n} level={reward.xp.level.level} />}
      {reward?.xp.questCompleted && <QuestCompletedNotice />}
      {complete.isError && <ErrorBox error={complete.error} />}

      <div className="chapter-cols">
        <section className="card glass chapter-body" role="tabpanel">
          {tab === "Lesson" && (
            <>
              {c.externalRef && (
                <div className="sys">
                  <span className="kicker">lekcija je van aplikacije</span>
                  <p style={{ margin: "8px 0 0" }}>Pročitaj: <strong>{c.externalRef}</strong>. Kad završiš, označi lekciju.</p>
                </div>
              )}
              {c.intro && <p className="prose" style={{ margin: 0 }}>{c.intro}</p>}
              {c.lessonMarkdown && <Markdown text={c.lessonMarkdown} />}
              <div>{doneButton("Lesson", "Lekcija pročitana")}</div>
            </>
          )}
          {tab === "Deeper" && c.deeperMarkdown && (<><Markdown text={c.deeperMarkdown} /><div>{doneButton("Deeper", "Završeno")}</div></>)}
          {tab === "Exercise" && exercise && (
            <>
              <div className="row between" style={{ gap: 8 }}>
                <span className="chapter-sub">Vežba</span>
                <span className={`quest-prog${exerciseCount === exercise.steps.length ? " done" : ""}`}>[{exerciseCount}/{exercise.steps.length}]</span>
              </div>
              {/* Čeklista kao dnevni zadatak; pravi checkbox-ovi (tastatura, čitači ekrana), samo drugačije nacrtani. */}
              <ol className="check-list">
                {exercise.steps.map((s, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={!!checked[i] || isDone("Exercise")} disabled={isDone("Exercise")}
                        onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })} />
                      <span className="prose" style={{ fontSize: 15 }}><Markdown text={s} /></span>
                    </label>
                  </li>
                ))}
              </ol>
              <div className="done-when">
                <strong>Gotovo je kad:</strong>
                <span>{exercise.done}</span>
              </div>
              <div>{doneButton("Exercise", "Vežba završena", !allChecked)}</div>
            </>
          )}
          {tab === "Test" && <TestGate c={c} />}
          {tab === "Cards" && c.cards.map((card, i) => (
            <details key={i} className="interview-card">
              <summary>{card.q}</summary>
              <p>{card.a}</p>
            </details>
          ))}
          {tab === "Sources" && (
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
              {c.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}
            </ul>
          )}
        </section>

        <aside className="chapter-side" aria-label="Nagrade za poglavlje">
          <Window title="Nagrade" badge="i">
            <ul className="detail-steps">
              {c.steps.map((s) => (
                <li key={s} className={isDone(s) ? "done" : ""}>
                  <span className="sr-only">{isDone(s) ? "Osvojeno: " : "Još nije: "}</span>
                  <span style={{ flex: 1 }}>{STEP_LABEL[s]}{s === "Test" ? " (prvi prolaz)" : ""}</span>
                  <span className="reward-xp">+{xpOf(s)} XP</span>
                </li>
              ))}
            </ul>
            <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
              Svaki korak donosi XP samo jednom. Netačni odgovori na testu idu u slabe tačke.
            </span>
          </Window>
        </aside>
      </div>

      <div className="row between">
        <div className="row">
          {c.prevId && <Link className="btn" to={`/chapters/${encodeURIComponent(c.prevId)}`}>← {c.prevId}</Link>}
          {c.nextId && <Link className="btn" to={`/chapters/${encodeURIComponent(c.nextId)}`}>{c.nextId} →</Link>}
        </div>
        {c.test.length > 0 && (
          <Link className="btn primary" to={`/chapters/${encodeURIComponent(c.id)}/test`}>
            {isDone("Test") ? `Ponovi test (najbolje ${c.bestPercent}%)` : `Uđi u test · ${c.test.length} pitanja`}
          </Link>
        )}
      </div>
    </>
  );
}

/** Kartica „Test”: podaci o dungeonu i ulaz (sam test je na posebnoj stranici, sa kapijom). */
function TestGate({ c }: { c: ChapterView }) {
  return (
    <>
      <span className="chapter-sub">Test · {c.test.length} pitanja</span>
      <span style={{ fontSize: 15, lineHeight: 1.7, color: "#dce3f2" }}>
        Prolaz {c.passPct}%. {c.bestPercent !== null ? `Najbolji rezultat do sada: ${c.bestPercent}%.` : "Još nisi radio ovaj test."}
        {" "}Ulazak pokreće kapiju dungeona; tačni odgovori stižu tek posle predaje.
      </span>
      <div>
        <Link className="btn primary" to={`/chapters/${encodeURIComponent(c.id)}/test`}>Uđi u dungeon</Link>
      </div>
    </>
  );
}
