import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Settings, type Theme } from "../api";
import { ErrorBox, Loading } from "../components/common";

const THEMES: { key: Theme; name: string; desc: string; accent: string; bg: string; border: string }[] = [
  { key: "sistem", name: "Sistem", desc: "Plavi prozor sistema.", accent: "#4da3ff", bg: "#0b0f1a", border: "#2a4a78" },
  { key: "monarh", name: "Monarh", desc: "Ljubičasta senka Monarha.", accent: "#a78bfa", bg: "#0c0a16", border: "#4a3a7a" },
  { key: "crveni", name: "Crveni gate", desc: "Crvena za opasne dungeone.", accent: "#ff6b81", bg: "#120a0d", border: "#7a2e40" },
  { key: "zlatni", name: "S-rang", desc: "Zlatna.", accent: "#ffc34d", bg: "#0f0d08", border: "#6b5420" },
];
const GOALS = [30, 60, 90, 120];

export function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const save = useMutation({
    mutationFn: api.saveSettings,
    // Optimistično: tema se menja odmah, pa se potvrdi sa servera.
    onMutate: (s) => qc.setQueryData(["settings"], s),
    onSettled: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} />;
  const s = q.data;
  const set = (patch: Partial<Settings>) => save.mutate({ ...s, ...patch });

  const Switch = ({ on, label, hint, onToggle }: { on: boolean; label: string; hint: string; onToggle: () => void }) => (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} className="list-row"
      style={{ width: "100%", background: "transparent", border: "none", borderTop: "1px solid var(--track)", cursor: "pointer", textAlign: "left" }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="muted" style={{ fontSize: 12 }}>{hint}</span>
      </span>
      <span style={{ width: 42, height: 24, borderRadius: 12, padding: 3, display: "flex", justifyContent: on ? "flex-end" : "flex-start", background: on ? "var(--accent)" : "#2a3350" }}>
        <span style={{ width: 18, height: 18, borderRadius: 9, background: "#0b0f1a" }} />
      </span>
    </button>
  );

  return (
    <>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="kicker">[ sistem ] podešavanja</span>
        <h1 className="title">Podešavanja</h1>
        <span className="muted">Čuvaju se odmah i važe na svim ekranima.</span>
      </header>
      {save.isError && <ErrorBox error={save.error} />}

      <section className="card" aria-labelledby="theme-h">
        <h2 id="theme-h" style={{ fontSize: 20 }}>Tema sistema</h2>
        <div className="grid" role="radiogroup" aria-labelledby="theme-h" style={{ ["--min" as string]: "200px" }}>
          {THEMES.map((t) => {
            const sel = s.theme === t.key;
            return (
              <button key={t.key} type="button" role="radio" aria-checked={sel} onClick={() => set({ theme: t.key })}
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 8, cursor: "pointer", textAlign: "left",
                  border: `1.5px solid ${sel ? t.accent : "var(--line)"}`, background: sel ? "var(--soft)" : "#0f1424", color: "var(--text)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", height: 60, padding: "0 14px", borderRadius: 4, border: `1px solid ${t.border}`, background: t.bg }}>
                  <span style={{ width: 20, height: 20, transform: "rotate(45deg)", border: `2px solid ${t.accent}` }} />
                  <span style={{ flex: 1, height: 6, borderRadius: 2, background: t.accent }} />
                </span>
                <strong>{t.name}{sel ? " · aktivna" : ""}</strong>
                <span className="muted" style={{ fontSize: 12 }}>{t.desc}</span>
              </button>
            );
          })}
        </div>
        <div>
          <Switch on={s.glow} label="Sjaj prozora" hint="Svetlucanje oko prozora sistema, ranga i dugmadi." onToggle={() => set({ glow: !s.glow })} />
          <Switch on={s.reduceMotion} label="Smanji animacije" hint="Bez prelaza i animacija." onToggle={() => set({ reduceMotion: !s.reduceMotion })} />
        </div>
      </section>

      <section className="card" aria-labelledby="el-h">
        <h2 id="el-h" style={{ fontSize: 20 }}>Elementi sistema</h2>
        <div>
          <Switch on={s.penaltyEnabled} label="Kazneni zadatak" hint="Ako propustiš dnevni zadatak, sutra prvo ide 20 min ponavljanja."
            onToggle={() => set({ penaltyEnabled: !s.penaltyEnabled })} />
        </div>
      </section>

      <section className="card" aria-labelledby="goal-h">
        <h2 id="goal-h" style={{ fontSize: 20 }}>Dnevni cilj</h2>
        <div className="tabs" role="radiogroup" aria-labelledby="goal-h">
          {GOALS.map((g) => (
            <button key={g} type="button" role="radio" className="pill" aria-checked={s.dailyGoalMinutes === g} onClick={() => set({ dailyGoalMinutes: g })}>
              {g < 60 ? `${g} min` : `${g / 60} h`}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
