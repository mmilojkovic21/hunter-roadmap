import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { ErrorBox, Loading } from "../components/common";
import { Icon } from "../components/Icon";

export function LibraryPage() {
  const qc = useQueryClient();
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const input = useRef<HTMLInputElement>(null);

  const refresh = () => {
    for (const k of ["packs", "status", "map", "settings", "chapter"]) qc.invalidateQueries({ queryKey: [k] });
  };
  const upload = useMutation({ mutationFn: api.uploadPack, onSuccess: refresh });
  const activate = useMutation({ mutationFn: api.activatePack, onSuccess: refresh });

  return (
    <>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="kicker">[ sistem ] biblioteka</span>
        <h1 className="title">Biblioteka paketa</h1>
        <span className="muted">Paket je jedna oblast učenja: Full Stack, cybersecurity, nemački, medicina… Aktivan paket određuje mapu, statistike i rang.</span>
      </header>

      <section className="sys row between" aria-label="Učitaj paket">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 style={{ fontSize: 20 }}>Učitaj paket</h2>
          <span className="muted" style={{ fontSize: 13 }}>.zip sa <code>pack.json</code> i <code>chapters.json</code> (format hunter-pack/1). Ista verzija paketa zamenjuje postojeću, napredak ostaje.</span>
        </div>
        <input ref={input} type="file" accept=".zip" hidden aria-label="Izaberi .zip paket"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
        <button type="button" className="btn primary" disabled={upload.isPending} onClick={() => input.current?.click()}>
          <Icon name="upload" /> {upload.isPending ? "Učitavam…" : "Izaberi .zip"}
        </button>
      </section>
      {upload.isError && <ErrorBox error={upload.error} />}
      {upload.isSuccess && <div className="card" role="status">Paket „{upload.data.title}” je učitan: {upload.data.chapterCount} poglavlja.</div>}

      {packs.isPending ? <Loading /> : packs.isError ? <ErrorBox error={packs.error} /> : (
        <div className="grid" style={{ ["--min" as string]: "320px" }}>
          {packs.data.length === 0 && <div className="empty">Još nema paketa.</div>}
          {packs.data.map((p) => (
            <article key={p.id} className="card" style={p.isActive ? { borderColor: "var(--accent)", boxShadow: "var(--glow-sm)" } : undefined}>
              <div className="row between">
                <h2 style={{ fontSize: 19 }}>{p.title}</h2>
                {p.isActive && <span className="kicker">aktivan</span>}
              </div>
              <span className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>{p.description}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted-2)" }}>
                {p.regionCount} regiona · {p.chapterCount} poglavlja · v{p.version}{p.author ? ` · ${p.author}` : ""}
              </span>
              {!p.isActive && (
                <button type="button" className="btn" disabled={activate.isPending} onClick={() => activate.mutate(p.id)} style={{ alignSelf: "flex-start" }}>
                  Aktiviraj
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {activate.isError && <ErrorBox error={activate.error} />}
    </>
  );
}
