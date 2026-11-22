import { Link } from "react-router";
import { ApiError } from "../api";

export function Loading() {
  return <div className="empty" role="status">Sistem učitava podatke…</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.status === 404) return <NoPack />;
  return <div className="error" role="alert">{error instanceof Error ? error.message : "Nešto nije u redu."}</div>;
}

export function NoPack() {
  return (
    <div className="sys" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="kicker">[ sistem ] nema aktivnog paketa</span>
      <h1>Izaberi šta učiš</h1>
      <p className="muted" style={{ margin: 0 }}>Učitaj paket sadržaja u Biblioteci ili aktiviraj postojeći.</p>
      <Link className="btn primary" to="/library" style={{ alignSelf: "flex-start" }}>Otvori Biblioteku</Link>
    </div>
  );
}

export function Bar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

export const STATUS_LABEL = { New: "Novo", InProgress: "U toku", Done: "Očišćeno" } as const;
