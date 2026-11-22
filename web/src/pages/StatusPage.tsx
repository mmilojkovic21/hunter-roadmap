import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Bar, ErrorBox, Loading, STATUS_LABEL } from "../components/common";
import { Icon } from "../components/Icon";
import { heatLevel, STEP_LABEL } from "../lib/quiz";

const HEAT_ALPHA = [0, 0.25, 0.45, 0.7, 1];

export function StatusPage() {
  const q = useQuery({ queryKey: ["status"], queryFn: api.status });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;
  const s = q.data;
  const quest = s.dailyQuest;
  const filled = Math.round(s.level.percent / 5);
  const weeks = Array.from({ length: 12 }, (_, w) => s.activity.slice(w * 7, w * 7 + 7));
  const continueTo = s.current ? `/chapters/${encodeURIComponent(s.current.id)}` : "/map";

  return (
    <>
      <header className="row between" style={{ alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="kicker">[ sistem ] dnevni izveštaj</span>
          <h1 className="title">Dobro došao nazad, Hunteru</h1>
          <span className="muted">{s.pack.title} · {s.doneChapters} / {s.totalChapters} poglavlja očišćeno</span>
        </div>
        <div className="row">
          <div className="card" style={{ flexDirection: "row", alignItems: "center", padding: "10px 16px", gap: 10, borderColor: "#3a2e14", background: "#1a160d" }}>
            <span style={{ color: "#ffb547" }}><Icon name="flame" size={20} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#ffcb7a" }}>{s.streak} {s.streak === 1 ? "dan" : "dana"}</div>
              <div style={{ fontSize: 11, color: "#c9b48a" }}>niz učenja · danas +{s.todayXp} XP</div>
            </div>
          </div>
          <Link className="btn primary" to={continueTo}>Nastavi učenje <Icon name="arrow" /></Link>
        </div>
      </header>

      <section className="sys row" aria-label="Rang i nivo" style={{ gap: 28 }}>
        <div className="rank" aria-label={`Rang ${s.rank}`}><span>{s.rank}</span></div>
        <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="kicker" style={{ color: "var(--muted)" }}>klasa: {s.pack.title}</span>
          <div className="row between">
            <h2 style={{ fontSize: 24 }}>Nivo {s.level.level} · Hunter {s.rank}-ranga</h2>
            <span style={{ fontFamily: "var(--mono)", color: "var(--muted-2)" }}>
              {s.level.xpIntoLevel} / {s.level.xpForNextLevel} XP
            </span>
          </div>
          <div className="xp-cells" role="progressbar" aria-label="XP do sledećeg nivoa" aria-valuenow={s.level.percent} aria-valuemin={0} aria-valuemax={100}>
            {Array.from({ length: 20 }, (_, i) => <span key={i} className={i < filled ? "on" : ""} />)}
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            Ukupno {s.level.totalXp} XP.{" "}
            {s.nextRank ? `Rang ${s.nextRank} na ${s.nextRankAtPct}% očišćenih poglavlja (sada ${s.completionPct}%).` : "Najviši rang dostignut."}
          </span>
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="stats-h">
        <h2 id="stats-h" style={{ fontSize: 20 }}>Statistike</h2>
        <div className="grid" style={{ ["--min" as string]: "180px" }}>
          {s.stats.map((st) => (
            <div key={st.key} className="card">
              <div className="row between">
                <span className="stat-key" style={{ color: st.color }}>{st.key}</span>
                <span className="stat-val">{st.percent}%</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{st.name}</span>
              <Bar pct={st.percent} color={st.color} />
              <span className="muted" style={{ fontSize: 12 }}>{st.done} / {st.total} poglavlja</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid" style={{ ["--min" as string]: "380px" }}>
        <section className="sys" aria-labelledby="quest-h" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="row between">
            <h2 id="quest-h" style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--accent)", letterSpacing: "0.08em" }}>
              [ ! ] DNEVNI ZADATAK
            </h2>
            {quest && (
              <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: quest.completed ? "var(--ok)" : "var(--text)" }}>
                {quest.doneCount}/{quest.tasks.length}
              </span>
            )}
          </div>
          {!quest && <span className="muted">Sve je očišćeno. Učitaj novi paket u Biblioteci.</span>}
          {quest && (
            <>
              <span className="muted" style={{ fontSize: 13 }}>
                Procena {quest.minutes} min · dnevni cilj {s.dailyGoalMinutes} min. Zadaci se biraju jednom dnevno.
              </span>
              <Bar pct={Math.round((quest.doneCount * 100) / quest.tasks.length)} color={quest.completed ? "var(--ok)" : undefined} />
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {quest.tasks.map((t) => (
                  <li key={t.chapterId + t.step}>
                    <Link className={`list-row quest-task${t.done ? " done" : ""}`}
                      to={t.step === "Test" ? `/chapters/${encodeURIComponent(t.chapterId)}/test` : `/chapters/${encodeURIComponent(t.chapterId)}`}>
                      <span className="quest-check" aria-hidden="true">{t.done && <Icon name="check" size={14} />}</span>
                      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span className="quest-task-title" style={{ fontWeight: 600 }}>
                          <span className="sr-only">{t.done ? "Urađeno: " : "Nije urađeno: "}</span>
                          {STEP_LABEL[t.step]}: {t.chapterTitle}
                        </span>
                        <span className="muted" style={{ fontSize: 12 }}>poglavlje {t.chapterId} · oko {t.minutes} min</span>
                      </span>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--warn)" }}>+{t.xp}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <span style={{ fontSize: 13, color: quest.completed ? "var(--ok)" : "var(--muted-2)" }}>
                {quest.completed
                  ? `Završeno! Osvojen ${quest.rewardPoints === 1 ? "slobodan poen" : `${quest.rewardPoints} slobodna poena`}.`
                  : `Nagrada: +${quest.rewardPoints} ${quest.rewardPoints === 1 ? "slobodan poen" : "slobodna poena"}.`}
              </span>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="dungeon-h">
          <div className="row between">
            <h2 id="dungeon-h" style={{ fontSize: 20 }}>Trenutni dungeon</h2>
            <span className="muted" style={{ fontSize: 12 }}>{s.currentRegionTitle}</span>
          </div>
          {s.currentLevel.map((c) => (
            <Link key={c.id} className="list-row" to={`/chapters/${encodeURIComponent(c.id)}`}>
              <span className={`badge ${c.status}`}>{c.id}</span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{c.title}</span>
                <span className="muted" style={{ fontSize: 12 }}>{c.subtitle || (c.external ? "lekcija u vodiču" : "")}</span>
              </span>
              <span className={`state-${c.status}`} style={{ fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[c.status]}</span>
            </Link>
          ))}
          <Link to="/map" style={{ fontWeight: 600, minHeight: 44, display: "flex", alignItems: "center" }}>Otvori celu mapu →</Link>
        </section>
      </div>

      <div className="grid" style={{ ["--min" as string]: "380px" }}>
        <section className="card weak" aria-labelledby="weak-h">
          <h2 id="weak-h" style={{ fontSize: 20 }}>Slabe tačke</h2>
          {s.weakPoints.length === 0 && <span className="muted">Nema netačnih odgovora u poslednjim testovima.</span>}
          {s.weakPoints.map((w, i) => (
            <Link key={i} className="list-row" to={`/chapters/${encodeURIComponent(w.chapterId)}`}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--bad)", minWidth: 40 }}>{w.chapterId}</span>
              <span style={{ flex: 1, fontSize: 14 }}>{w.question}</span>
            </Link>
          ))}
        </section>

        <section className="card" aria-labelledby="act-h">
          <h2 id="act-h" style={{ fontSize: 20 }}>Aktivnost · 12 nedelja</h2>
          <div className="heat" role="img" aria-label="XP po danima u poslednjih 12 nedelja">
            {weeks.map((w, i) => (
              <div key={i} className="heat-col">
                {w.map((d) => {
                  const a = HEAT_ALPHA[heatLevel(d.xp)];
                  return <span key={d.day} title={`${d.day}: ${d.xp} XP`}
                    style={{ background: a === 0 ? "#161d30" : `rgba(var(--accent-rgb), ${a})` }} />;
                })}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
