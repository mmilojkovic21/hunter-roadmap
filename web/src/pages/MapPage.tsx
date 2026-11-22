import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Bar, ErrorBox, Loading, STATUS_LABEL } from "../components/common";

export function MapPage() {
  const q = useQuery({ queryKey: ["map"], queryFn: api.map });
  const [params, setParams] = useSearchParams();
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;

  const regions = q.data.regions;
  const selected = regions.find((r) => r.code === params.get("r")) ?? regions[0];
  const total = regions.reduce((n, r) => n + r.levels.reduce((m, l) => m + l.chapters.length, 0), 0);

  return (
    <>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="kicker">[ sistem ] mapa veština</span>
        <h1 className="title">{q.data.packTitle}</h1>
        <span className="muted">{regions.length} regiona, {total} poglavlja. Poglavlje: lekcija → dublje → vežba → test.</span>
      </header>

      <div className="tabs" role="tablist" aria-label="Regioni">
        {regions.map((r) => (
          <button key={r.code} type="button" role="tab" className="pill" aria-selected={r.code === selected.code}
            onClick={() => setParams({ r: r.code })}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, marginRight: 8, color: r.statColor }}>{r.code}</span>
            {r.title.split("·").pop()?.trim()}
            <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{r.percent}%</span>
          </button>
        ))}
      </div>

      <section className="card" aria-labelledby="region-h" role="tabpanel">
        <div className="row between">
          <h2 id="region-h" style={{ fontSize: 22 }}>{selected.title}</h2>
          <span className="stat-key" style={{ color: selected.statColor }}>STAT {selected.stat}</span>
        </div>
        <Bar pct={selected.percent} color={selected.statColor} />
      </section>

      {selected.levels.map((l) => (
        <section key={l.name} style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-label={l.name}>
          <div className="level-name">{l.name}</div>
          <div className="chapters">
            {l.chapters.map((c) => (
              <Link key={c.id} className="chapter-card" to={`/chapters/${encodeURIComponent(c.id)}`}>
                <span className={`badge ${c.status}`}>{c.id}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {c.external ? "lekcija u vodiču · " : ""}{c.stepsDone}/{c.stepsTotal} koraka{c.hasTest ? " · test" : ""}
                  </span>
                </span>
                <span className={`state-${c.status}`} style={{ fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[c.status]}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
