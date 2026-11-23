import { Link } from "react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type DailyQuestTaskView, type StatusView } from "../api";
import { ErrorBox, Loading, STATUS_LABEL } from "../components/common";
import { Icon } from "../components/Icon";
import { useCountUp, useRankChanged, useSeenNumbers } from "../components/Fx";
import { Window } from "../components/Window";
import { PenaltyDialog } from "../components/PenaltyDialog";
import { heatLevel, STEP_LABEL } from "../lib/quiz";

const HEAT_ALPHA = [0, 0.25, 0.45, 0.7, 1];

/** Vreme do ponoći po satu uređaja, za odbrojavanje u upozorenju o kaznenom zadatku. */
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

/** Romb ranga (zadržan u Sistemu 2.0); okrene se i pusti talas svetla samo kad se rang promeni od poslednjeg prikaza statusa. */
function RankBadge({ packId, rank }: { packId: string; rank: string }) {
  const changed = useRankChanged(packId, rank);
  return (
    <div className={`rank${changed ? " fx-rank-up" : ""}`} role="img" aria-label={`Rang ${rank}`}>
      <span aria-hidden="true">{rank}</span>
      {changed && <i className="rank-wave" aria-hidden="true" />}
    </div>
  );
}

/** Lokalni datum (YYYY-MM-DD), isti oblik kao u boot ekranu. */
const localToday = () => new Date().toLocaleDateString("sv");

/**
 * Aktivan kazneni zadatak: crveni prozor se sam otvori jednom dnevno, a posle „Prihvati” ili Esc
 * ostaje crvena tabla sa dugmetom za ponovno otvaranje. Šta je viđeno pamti pregledač (udobnost, ne stanje igre).
 */
function PenaltyGate({ packId, reviews }: { packId: string; reviews: DailyQuestTaskView[] }) {
  const key = `hunter.penalty.seen.${packId}`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(key) !== localToday(); } catch { return true; }
  });
  const close = () => {
    setOpen(false);
    try { localStorage.setItem(key, localToday()); } catch { /* prozor će se samo ponovo otvoriti */ }
  };
  return (
    <>
      {open && <PenaltyDialog tasks={reviews} onClose={close} />}
      <section className="penalty" aria-labelledby="pen-h">
        <h2 id="pen-h" className="penalty-title">[ KAZNA ] KAZNENI ZADATAK AKTIVAN</h2>
        <span className="penalty-text">
          Jučerašnji dnevni zadatak nije završen. Pre nove lekcije ponovi slabe tačke:
          {" "}{reviews.length === 1 ? "1 test" : `${reviews.length} testa`} (~{reviews.reduce((sum, t) => sum + t.minutes, 0)} min), na vrhu dnevnog zadatka.
        </span>
        <div><button type="button" className="btn" onClick={() => setOpen(true)}>Otvori prozor kazne</button></div>
      </section>
    </>
  );
}

const points = (n: number) => (n === 1 ? "1 slobodan poen" : `${n} slobodna poena`);

/** Brojke sa statusa koje se pamte između poseta, da bi se nova vrednost odbrojala od stare. */
interface SeenStatus { level: number; xp: number; points: number; stats: Record<string, number> }

/**
 * Prozor STATUS (kanvas „9 · Sistem 2.0”): levo identitet (romb, nivo, podaci, XP traka),
 * desno statistike sa „+” i slobodni poeni. Brojke se odbrojavaju od poslednje viđene vrednosti.
 */
function StatusWindow({ s }: { s: StatusView }) {
  const qc = useQueryClient();
  const allocate = useMutation({
    mutationFn: api.allocatePoint,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
  });
  const seen = useSeenNumbers<SeenStatus>(`hunter.seen.${s.pack.id}`, {
    level: s.level.level, xp: s.level.xpIntoLevel, points: s.freePoints,
    stats: Object.fromEntries(s.stats.map((st) => [st.key, st.value])),
  });
  const level = useCountUp(s.level.level, seen?.level);
  // Posle level-up-a XP u nivou je manji nego pre, pa traka kreće od nule umesto da se „vraća”.
  const xp = useCountUp(s.level.xpIntoLevel, seen && seen.level === s.level.level ? seen.xp : 0);
  const freePoints = useCountUp(s.freePoints, seen?.points);
  const filled = Math.round((xp / s.level.xpForNextLevel) * 20);

  return (
    <Window title="Status" glass>
      <div className="status-grid">
        <div className="status-main">
          <div className="status-id">
            <RankBadge packId={s.pack.id} rank={s.rank} />
            <div className="status-level">
              <span className="status-level-num">{level}</span>
              <span className="win-label">Nivo</span>
            </div>
            <dl className="status-data">
              <dt className="win-label">Ime</dt><dd>Hunter</dd>
              <dt className="win-label">Klasa</dt><dd>{s.pack.title}</dd>
              <dt className="win-label">Rang</dt>
              <dd>
                Hunter {s.rank}-ranga
                {s.nextRank ? ` · ${s.nextRank} na ${s.nextRankAtPct}% očišćenih (sada ${s.completionPct}%)` : " · najviši rang"}
              </dd>
              <dt className="win-label">Niz</dt>
              <dd className="status-streak">
                {/* Plamen treperi dok je niz živ; dok danas nema XP-a mirniji je i bleđi, bez varnica. */}
                <span className={`flame${s.streak > 0 ? (s.todayXp > 0 ? " live" : " idle") : ""}`} aria-hidden="true">
                  <Icon name="flame" size={18} />
                  {s.streak > 0 && s.todayXp > 0 && <><i className="ember e1" /><i className="ember e2" /></>}
                </span>
                {s.streak} {s.streak === 1 ? "dan" : "dana"} · danas +{s.todayXp} XP
              </dd>
            </dl>
          </div>
          <div className="status-xp">
            <div className="row between">
              <span className="win-label">XP</span>
              <span className="status-xp-val">{xp} / {s.level.xpForNextLevel}</span>
            </div>
            <div className="xp-cells" role="progressbar" aria-label="XP do sledećeg nivoa"
              aria-valuenow={s.level.percent} aria-valuemin={0} aria-valuemax={100}>
              {Array.from({ length: 20 }, (_, i) => <span key={i} className={i < filled ? "on" : ""} />)}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              Ukupno {s.level.totalXp} XP · {s.doneChapters} / {s.totalChapters} poglavlja očišćeno
            </span>
          </div>
        </div>

        <div className="status-stats">
          {allocate.isError && <ErrorBox error={allocate.error} />}
          <ul className="stat-list" aria-label="Statistike">
            {s.stats.map((st) => (
              <StatRow key={st.key} st={st} from={seen?.stats[st.key]}
                canAdd={s.freePoints > 0 && !allocate.isPending} onAdd={() => allocate.mutate(st.key)} />
            ))}
          </ul>
          <div className="status-points">
            <span>SLOBODNI POENI: <strong>{freePoints}</strong></span>
            <span className="muted">Dodeli ih oblasti na koju se fokusiraš ove nedelje.</span>
          </div>
        </div>
      </div>
    </Window>
  );
}

function StatRow({ st, from, canAdd, onAdd }: {
  st: StatusView["stats"][number]; from?: number; canAdd: boolean; onAdd: () => void;
}) {
  const value = useCountUp(st.value, from);
  return (
    <li className="stat-row">
      <span className="stat-key" style={{ color: st.color }}>{st.key}</span>
      <span className="stat-name">
        <span>{st.name}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {st.done} / {st.total} poglavlja{st.points > 0 && ` · ${st.points} ${st.points === 1 ? "poen" : "poena"}`}
        </span>
      </span>
      <span className="stat-val">{value}</span>
      <button type="button" className="stat-add" aria-label={`Dodeli poen: ${st.name}`} disabled={!canAdd} onClick={onAdd}>
        <span aria-hidden="true">+</span>
      </button>
    </li>
  );
}

/** Prozor DNEVNI ZADATAK (kanvas „9 · Sistem 2.0”), sa upozorenjem o kazni na dnu kao na kanvasu. */
function QuestWindow({ quest, penaltyWarning }: { quest: StatusView["dailyQuest"]; penaltyWarning: boolean }) {
  const timeLeft = useTimeToMidnight();
  return (
    <Window title="Dnevni zadatak">
      {!quest && <span className="muted">Sve je očišćeno. Učitaj novi paket u Biblioteci.</span>}
      {quest && (
        <>
          <span className="win-label quest-goal">Cilj: završi sve zadatke pre ponoći</span>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {quest.tasks.map((t) => (
              <li key={t.chapterId + t.step}>
                <Link className={`quest-task${t.done ? " done" : ""}${t.review ? " review" : ""}`}
                  to={t.step === "Test" ? `/chapters/${encodeURIComponent(t.chapterId)}/test` : `/chapters/${encodeURIComponent(t.chapterId)}`}>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      <span className="sr-only">{t.done ? "Urađeno: " : "Nije urađeno: "}</span>
                      {t.review ? "Ponovi test" : STEP_LABEL[t.step]}: {t.chapterTitle}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {t.review ? "Kazneni zadatak · slabe tačke" : `Poglavlje ${t.chapterId} · +${t.xp} XP`} · ~{t.minutes} min
                    </span>
                  </span>
                  {/* [x/1] kao na kanvasu; stanje za čitač ekrana je već u sr-only tekstu iznad. */}
                  <span className="quest-prog" aria-hidden="true">[{t.done ? 1 : 0}/1]</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="row between quest-foot">
            <span className="win-label">Nagrada</span>
            <span>
              {quest.doneCount}/{quest.tasks.length} · +{quest.tasks.filter((t) => t.done).reduce((sum, t) => sum + t.xp, 0)} XP
              {" "}· +{points(quest.rewardPoints)}
            </span>
          </div>
          {quest.completed && (
            <span style={{ fontSize: 14, color: "var(--ok)" }}>Zadatak završen! Osvojen {points(quest.rewardPoints)}.</span>
          )}
          {penaltyWarning && (
            <div className="quest-warn">
              <strong>UPOZORENJE</strong>
              <span>Nezavršen zadatak donosi kazneni zadatak: sutra prvo 20 minuta ponavljanja slabih tačaka.</span>
              <span className="quest-warn-time" aria-live="off">Preostalo vreme: {timeLeft}</span>
            </div>
          )}
        </>
      )}
    </Window>
  );
}

export function StatusPage() {
  const q = useQuery({ queryKey: ["status"], queryFn: api.status });
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;
  const s = q.data;
  const quest = s.dailyQuest;
  const reviews = quest?.tasks.filter((t) => t.review) ?? [];
  const penaltyActive = reviews.some((t) => !t.done);
  // Upozorenje za sutra: kazna je uključena, a današnji zadatak još nije završen.
  const penaltyWarning = !penaltyActive && settings.data?.penaltyEnabled === true && quest !== null && !quest.completed;
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
        <Link className="btn primary" to={continueTo}>Nastavi učenje <Icon name="arrow" /></Link>
      </header>

      <StatusWindow s={s} />

      <div className="grid" style={{ ["--min" as string]: "380px" }}>
        <QuestWindow quest={quest} penaltyWarning={penaltyWarning} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {penaltyActive && <PenaltyGate packId={s.pack.id} reviews={reviews.filter((t) => !t.done)} />}
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
