import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Step, type XpResult } from "../api";
import { ErrorBox, Loading, Markdown, STATUS_LABEL } from "../components/common";
import { Icon } from "../components/Icon";
import { STEP_LABEL } from "../lib/quiz";

type Tab = "Lesson" | "Deeper" | "Exercise" | "Cards" | "Sources";

export function ChapterPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["chapter", id], queryFn: () => api.chapter(id) });
  const [tab, setTab] = useState<Tab>("Lesson");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [reward, setReward] = useState<XpResult | null>(null);

  const complete = useMutation({
    mutationFn: (step: Step) => api.completeStep(id, step),
    onSuccess: (r) => {
      setReward(r.xpAwarded > 0 ? r : null);
      qc.invalidateQueries({ queryKey: ["chapter", id] });
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["map"] });
    },
  });

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;
  const c = q.data;
  const isDone = (s: Step) => c.completed.includes(s);
  const exercise = c.exercise;
  const allChecked = exercise ? exercise.steps.every((_, i) => checked[i]) : false;

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "Lesson", label: "Lekcija", show: true },
    { key: "Deeper", label: "Dublje", show: !!c.deeperMarkdown },
    { key: "Exercise", label: "Vežba", show: !!exercise },
    { key: "Cards", label: `Pitanja sa intervjua (${c.cards.length})`, show: c.cards.length > 0 },
    { key: "Sources", label: "Izvori", show: c.sources.length > 0 },
  ];

  const doneButton = (step: Step, label: string, disabled = false) =>
    isDone(step)
      ? <span className="state-Done" style={{ fontWeight: 600 }}><Icon name="check" /> {STEP_LABEL[step]} završena</span>
      : <button type="button" className="btn primary" disabled={disabled || complete.isPending} onClick={() => complete.mutate(step)}>{label}</button>;

  return (
    <>
      <div className="row between">
        <Link to="/map" className="btn"><Icon name="back" /> Mapa</Link>
        <span className="kicker">{c.regionTitle} · {c.level}</span>
      </div>

      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontFamily: "var(--mono)", color: "var(--muted)" }}>POGLAVLJE {c.id} · ~{c.minutes} min · {STATUS_LABEL[c.status]}</span>
        <h1 className="title">{c.title}</h1>
        {c.subtitle && <span className="muted">{c.subtitle}</span>}
        <div className="row" style={{ gap: 8 }}>
          {c.steps.map((s) => (
            <span key={s} className="pill" aria-pressed={isDone(s)} style={{ cursor: "default", minHeight: 32, fontSize: 12 }}>
              {isDone(s) ? "✓ " : ""}{STEP_LABEL[s]}
            </span>
          ))}
        </div>
      </header>

      {reward && (
        <div className="sys" role="status">
          <span className="kicker">[ sistem ] +{reward.xpAwarded} XP</span>
          {reward.levelUp && <h2 style={{ marginTop: 6 }}>LEVEL UP! Nivo {reward.level.level}</h2>}
        </div>
      )}
      {complete.isError && <ErrorBox error={complete.error} />}

      <div className="tabs" role="tablist" aria-label="Delovi poglavlja">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.key} type="button" role="tab" className="pill" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <section className="card" role="tabpanel">
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
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {exercise.steps.map((s, i) => (
                <li key={i}>
                  <label className="option" style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={!!checked[i] || isDone("Exercise")} disabled={isDone("Exercise")}
                      onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })} style={{ width: 20, height: 20 }} />
                    <span className="prose" style={{ fontSize: 15 }}><Markdown text={s} /></span>
                  </label>
                </li>
              ))}
            </ol>
            <div className="card" style={{ borderStyle: "dashed", borderColor: "#2f8f73" }}>
              <strong className="state-Done">Gotovo je kad:</strong>
              <span>{exercise.done}</span>
            </div>
            <div>{doneButton("Exercise", "Vežba završena", !allChecked)}</div>
          </>
        )}
        {tab === "Cards" && c.cards.map((card, i) => (
          <details key={i} className="card" style={{ background: "#141020", borderColor: "#3b2533" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, minHeight: 28 }}>{card.q}</summary>
            <p style={{ marginBottom: 0, lineHeight: 1.6 }}>{card.a}</p>
          </details>
        ))}
        {tab === "Sources" && (
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
            {c.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}
          </ul>
        )}
      </section>

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
