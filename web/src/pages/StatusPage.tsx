import { Link } from "react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Bar, ErrorBox, Loading, STATUS_LABEL } from "../components/common";
import { Icon } from "../components/Icon";
import { heatLevel, STEP_LABEL } from "../lib/quiz";

const HEAT_ALPHA = [0, 0.25, 0.45, 0.7, 1];

/** Vreme do ponoći po satu uređaja, za odbrojavanje na kartici kaznenog zadatka. */
function useTimeToMidnight() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const sec = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  return [sec / 3600, (sec % 3600) / 60, sec % 60].map((n) => String(Math.floor(n)).padStart(2, "0")).join(":");
}

const points = (n: number) => (n === 1 ? "1 slobodan poen" : `${n} slobodna poena`);

export function StatusPage() {
  const q = useQuery({ queryKey: ["status"], queryFn: api.status });
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const timeLeft = useTimeToMidnight();
  const qc = useQueryClient();
  const allocate = useMutation({
    mutationFn: api.allocatePoint,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
  });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;
  const s = q.data;
  const quest = s.dailyQuest;
  const reviews = quest?.tasks.filter((t) => t.review) ?? [];
  const penaltyActive = reviews.some((t) => !t.done);
  // Upozorenje za sutra: kazna je uključena, a današnji zadatak još nije završen.
  const penaltyWarning = !penaltyActive && settings.data?.penaltyEnabled === true && quest !== null && !quest.completed;
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
        <div className="row between" style={{ gap: 10 }}>
          <h2 id="stats-h" style={{ fontSize: 20 }}>Statistike</h2>
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent)" }}>
            SLOBODNI POENI: {s.freePoints} · dodeli ih oblasti na koju se fokusiraš ove nedelje
          </span>
        </div>
        {allocate.isError && <ErrorBox error={allocate.error} />}
        <div className="grid" style={{ ["--min" as string]: "180px" }}>
          {s.stats.map((st) => (
            <div key={st.key} className="card">
              <div className="row between">
                <span className="stat-key" style={{ color: st.color }}>{st.key}</span>
                <span className="stat-val">{st.value}</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{st.name}</span>
              <Bar pct={st.value} color={st.color} />
              <div className="row between" style={{ gap: 8, flexWrap: "nowrap" }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  {st.done} / {st.total} poglavlja{st.points > 0 && ` · ${st.points} ${st.points === 1 ? "poen" : "poena"}`}
                </span>
                <button type="button" className="stat-add" aria-label={`Dodeli poen: ${st.name}`}
                  disabled={s.freePoints === 0 || allocate.isPending} onClick={() => allocate.mutate(st.key)}>
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid" style={{ ["--min" as string]: "380px" }}>
        <section className="quest" aria-labelledby="quest-h">
          <div className="row between" style={{ gap: 10 }}>
            <h2 id="quest-h" style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em" }}>
              [ ! ] DNEVNI ZADATAK STIGAO
            </h2>
            {quest && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--warn)" }}>
                {quest.doneCount}/{quest.tasks.length} · +{quest.tasks.filter((t) => t.done).reduce((sum, t) => sum + t.xp, 0)} XP
              </span>
            )}
          </div>
          {!quest && <span className="muted">Sve je očišćeno. Učitaj novi paket u Biblioteci.</span>}
          {quest && (
            <>
              <span style={{ fontSize: 13, color: quest.completed ? "var(--ok)" : "var(--muted-2)" }}>
                {quest.completed
                  ? `Zadatak završen! Osvojen ${points(quest.rewardPoints)}.`
                  : `Završi sve pre ponoći. Nagrada: +${points(quest.rewardPoints)}.`}
              </span>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {quest.tasks.map((t) => (
                  <li key={t.chapterId + t.step}>
                    <Link className={`quest-task${t.done ? " done" : ""}${t.review ? " review" : ""}`}
                      to={t.step === "Test" ? `/chapters/${encodeURIComponent(t.chapterId)}/test` : `/chapters/${encodeURIComponent(t.chapterId)}`}>
                      <span className="quest-check" aria-hidden="true">
                        {t.done && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          <span className="sr-only">{t.done ? "Urađeno: " : "Nije urađeno: "}</span>
                          {t.review ? "Ponovi test" : STEP_LABEL[t.step]}: {t.chapterTitle}
                        </span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {t.review ? "Kazneni zadatak · slabe tačke" : `Poglavlje ${t.chapterId}`} · ~{t.minutes} min
                        </span>
                      </span>
                      {t.review
                        ? <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--penalty-text)" }}>KAZNA</span>
                        : <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--warn)" }}>+{t.xp}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {penaltyActive && (
          <section className="penalty" aria-labelledby="pen-h">
            <h2 id="pen-h" className="penalty-title">[ KAZNA ] KAZNENI ZADATAK AKTIVAN</h2>
            <span className="penalty-text">
              Jučerašnji dnevni zadatak nije završen. Pre nove lekcije ponovi slabe tačke:
              {" "}{reviews.length === 1 ? "1 test" : `${reviews.length} testa`} (~{reviews.reduce((sum, t) => sum + t.minutes, 0)} min), na vrhu dnevnog zadatka.
            </span>
          </section>
        )}
        {penaltyWarning && (
          <section className="penalty" aria-labelledby="pen-h">
            <h2 id="pen-h" className="penalty-title">[ UPOZORENJE ] KAZNENI ZADATAK</h2>
            <span className="penalty-text">Ako dnevni zadatak ne bude završen do ponoći, sutra se dodaje 20 minuta ponavljanja slabih tačaka pre nove lekcije.</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "#ffb3c1" }} aria-live="off">Preostalo vreme: {timeLeft}</span>
          </section>
        )}
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
