import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type ChapterRef, type ChapterStatus, type MapView, type RegionView } from "../api";
import { ErrorBox, Loading } from "../components/common";
import { useNewlyCleared } from "../components/Fx";
import { Window } from "../components/Window";
import { STEP_LABEL } from "../lib/quiz";

// Mapa veština u Sistemu 2.0 (kanvas „10 · Mapa veština”): regioni su gate-ovi, poglavlja pločice sa stanjem,
// desno prozor DETALJI. Stanje „zaključano” sa kanvasa se ne pravi: poglavlja nisu zaključana (odluka iz faze 2).

const TILE: Record<ChapterStatus, { icon: string; label: string }> = {
  Done: { icon: "✓", label: "Očišćeno" },
  InProgress: { icon: "▸", label: "U toku" },
  New: { icon: "○", label: "Novo" },
};

/** „Deo 0 · Programiranje od nule” → „Programiranje od nule” (kratko ime gate-a). */
const shortName = (title: string) => title.split("·").pop()!.trim();

const chaptersOf = (r: RegionView) => r.levels.flatMap((l) => l.chapters);

/** Podrazumevano izabrano poglavlje: ono u toku, pa prvo novo, pa prvo u regionu. */
function defaultChapter(r: RegionView): ChapterRef | undefined {
  const all = chaptersOf(r);
  return all.find((c) => c.status === "InProgress") ?? all.find((c) => c.status === "New") ?? all[0];
}

export function MapPage() {
  const q = useQuery({ queryKey: ["map"], queryFn: api.map });
  const [params, setParams] = useSearchParams();
  const doneIds = q.data?.regions.flatMap((r) => chaptersOf(r).filter((c) => c.status === "Done").map((c) => c.id));
  const fresh = useNewlyCleared(q.data?.packId, doneIds);
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;

  const map = q.data;
  const region = map.regions.find((r) => r.code === params.get("r")) ?? map.regions[0];
  const chapter = chaptersOf(region).find((c) => c.id === params.get("c")) ?? defaultChapter(region);
  const total = map.regions.reduce((n, r) => n + chaptersOf(r).length, 0);

  return (
    <>
      <Window title="Mapa veština" level={1} glass>
        <span className="muted">
          {map.packTitle} · {map.regions.length} regiona, {total} poglavlja. Poglavlje: lekcija → dublje → vežba → test.
        </span>
        <div className="gate-tabs" role="tablist" aria-label="Regioni (gate-ovi)">
          {map.regions.map((r) => (
            <button key={r.code} type="button" role="tab" id={`tab-${r.code}`} aria-controls="gate-panel"
              className="gate-tab" aria-selected={r.code === region.code} onClick={() => setParams({ r: r.code })}>
              <span className="gate-rank" aria-hidden="true"><span>{r.rank}</span></span>
              <span className="sr-only">Rang {r.rank}: </span>
              <span className="gate-tab-text">
                <span className="gate-tab-name">{shortName(r.title)}</span>
                <span className="gate-tab-pct">{r.percent}% očišćeno{r.boss === "Cleared" ? " · boss ✓" : ""}</span>
              </span>
            </button>
          ))}
        </div>
      </Window>

      <div className="map-cols">
        <div id="gate-panel" role="tabpanel" aria-labelledby={`tab-${region.code}`} className="map-gate">
          <Window title={`Gate ${region.code} · ${shortName(region.title)} · ${region.rank}-rang`}>
            {region.levels.map((l) => (
              <section key={l.name} className="map-level" aria-label={l.name}>
                <span className="win-label">{l.name}</span>
                <div className="chapters">
                  {l.chapters.map((c) => (
                    <button key={c.id} type="button" aria-pressed={c.id === chapter?.id}
                      className={`chapter-card tile-${c.status}${fresh.has(c.id) ? " fx-glow" : ""}`}
                      onClick={() => setParams({ r: region.code, c: c.id }, { replace: true })}>
                      <span className="tile-num">{c.id}</span>
                      <span className="tile-text">
                        <span className="tile-title">{c.title}</span>
                        <span className="tile-state">{TILE[c.status].label}{c.external ? " · lekcija u vodiču" : ""}</span>
                      </span>
                      <span className="tile-icon" aria-hidden="true">{TILE[c.status].icon}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            <BossPanel region={region} map={map} />
          </Window>
        </div>

        {chapter && <DetailWindow chapter={chapter} />}
      </div>
    </>
  );
}

/** Boss gate na dnu regiona: zapečaćen dok sva poglavlja nisu očišćena (BossRules na serveru). */
function BossPanel({ region, map }: { region: RegionView; map: MapView }) {
  const all = chaptersOf(region);
  return (
    <section className="boss-card" aria-labelledby="boss-h">
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span id="boss-h" className="boss-card-title">Boss gate</span>
        <span className="boss-card-text">
          {region.bossQuestions} pitanja iz celog regiona · prolaz {map.bossPassPct}% · +{map.bossXp} XP
        </span>
      </span>
      {region.boss === "Locked" && (
        <span className="boss-state">ZAPEČAĆEN · {all.filter((c) => c.status === "Done").length}/{all.length}</span>
      )}
      {region.boss === "Ready" && <Link className="btn boss-btn" to={`/boss/${encodeURIComponent(region.code)}`}>Uđi u boss gate →</Link>}
      {region.boss === "Cleared" && (
        <span className="row" style={{ gap: 12 }}>
          <span className="boss-state" style={{ color: "var(--ok)" }}>BOSS PORAŽEN ✓</span>
          <Link to={`/boss/${encodeURIComponent(region.code)}`} style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 600 }}>Ponovi</Link>
        </span>
      )}
    </section>
  );
}

/** Prozor DETALJI: koraci izabranog poglavlja sa XP-om i stanjem; podaci iz istog upita kao stranica poglavlja. */
function DetailWindow({ chapter }: { chapter: ChapterRef }) {
  const q = useQuery({ queryKey: ["chapter", chapter.id], queryFn: () => api.chapter(chapter.id) });
  return (
    <aside className="map-detail" aria-label="Detalji poglavlja">
      <Window title="Detalji" badge="i">
        <span className="win-label">Poglavlje {chapter.id}</span>
        <span className="detail-title">{chapter.title}</span>
        {chapter.subtitle && <span className="muted" style={{ fontSize: 14 }}>{chapter.subtitle}</span>}
        {q.isError && <ErrorBox error={q.error} />}
        {q.data && (
          <ul className="detail-steps">
            {q.data.steps.map((st, i) => {
              const done = q.data.completed.includes(st);
              return (
                <li key={st} className={done ? "done" : ""}>
                  <span className="sr-only">{done ? "Urađeno: " : "Nije urađeno: "}</span>
                  <span style={{ flex: 1 }}>{STEP_LABEL[st]} · +{q.data.stepXp[i]} XP</span>
                  <span className="detail-mark" aria-hidden="true">{done ? "[✓]" : "[ ]"}</span>
                </li>
              );
            })}
          </ul>
        )}
        <Link className="btn primary" to={`/chapters/${encodeURIComponent(chapter.id)}`}>
          {chapter.status === "Done" ? "Ponovi poglavlje" : "Uđi u gate"}
        </Link>
      </Window>
    </aside>
  );
}
