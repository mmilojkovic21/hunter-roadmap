import { useEffect, useRef, useState } from "react";
import { countUpAt } from "../lib/countUp";

// Animacije sistema (faza 2, stavka 8). Izgled i keyframes su u styles.css („Animacije sistema”).
// Okidač je uvek podatak sa API-ja (levelUp, firstClear, promenjen rang, novo očišćeno poglavlje),
// a ovde se samo odlučuje da li se animacija prikazuje. Ništa od ovoga ne blokira klikove.

/** LEVEL UP: traka se dopuni i zasvetli, natpis iskoči. Prikazuje se kad XpResult.levelUp. */
export function LevelUp({ level }: { level: number }) {
  return (
    <section className="levelup" role="status">
      <div className="levelup-bar" aria-hidden="true"><span /></div>
      <strong className="levelup-title">LEVEL UP</strong>
      <span className="levelup-label">Nivo {level - 1} → {level}</span>
    </section>
  );
}

/** „+50 XP” isplovi iznad dugmeta koraka. `key` roditelja ponovo pokreće animaciju za svaki novi korak. */
export function XpFloat({ xp }: { xp: number }) {
  return <span className="fx-float" aria-hidden="true">+{xp} XP</span>;
}

/** Trajanje kapije u ms: kašnjenje 0,2 s + otvaranje 1,1 s (styles.css, .gate-l) + mala rezerva. */
const GATE_MS = 1500;

/**
 * Ulazak u dungeon: dve polovine kapije se razmaknu, pa sloj nestane. Samo dekor (aria-hidden, bez klikova).
 * Uklanja se tajmerom, ne događajem animationend: on ne stiže kad je kartica u pozadini ili su animacije isključene.
 */
export function DungeonGate({ label }: { label: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), GATE_MS);
    return () => clearTimeout(t);
  }, []);
  if (!open) return null;
  return (
    <div className="gate" aria-hidden="true">
      <div className="gate-ring" />
      <div className="gate-half gate-l" />
      <div className="gate-half gate-r" />
      <span className="gate-label">{label}</span>
    </div>
  );
}

/** DUNGEON CLEARED: zlatni zrak, natpis i nagrade jedna za drugom. Samo kad je BossResultView.firstClear. */
export function RegionCleared({ title, rewards }: { title: string; rewards: string[] }) {
  return (
    <section className="cleared" role="status">
      <i className="cleared-sweep" aria-hidden="true" />
      <strong className="cleared-title">DUNGEON CLEARED</strong>
      <span className="cleared-sub">{title} je očišćen. Boss je poražen.</span>
      <div className="row" style={{ justifyContent: "center", gap: 8 }}>
        {rewards.map((r) => <span key={r} className="cleared-chip">{r}</span>)}
      </div>
    </section>
  );
}

// ---------- „šta je novo od poslednjeg puta” ----------
// Rang i očišćena poglavlja dolaze sa API-ja; da bi animacija išla samo JEDNOM, pamti se šta je korisnik
// već video. To je udobnost po pregledaču (localStorage), ne stanje igre: ako se izgubi, animacija se preskoči.

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : (JSON.parse(v) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* privatni režim ili blokiran storage: animacija se samo neće ponoviti tačno jednom */
  }
}

/**
 * Da li se rang promenio od poslednjeg prikaza statusa. Prvi prikaz ikad nema animacije.
 * Ref čuva da se upis izvrši jednom i kad StrictMode u razvoju dvaput pokrene efekat.
 */
export function useRankChanged(packId: string, rank: string): boolean {
  const [changed, setChanged] = useState(false);
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const key = `hunter.rank.${packId}`;
    if (handled.current === key + rank) return;
    handled.current = key + rank;
    const prev = read<string>(key);
    write(key, rank);
    setChanged(prev !== null && prev !== rank);
  }, [packId, rank]);
  return changed;
}

/** Poglavlja očišćena od poslednje posete mapi (za kratak sjaj kartice). Prva poseta ikad ne svetli ništa. */
export function useNewlyCleared(packId: string | undefined, doneIds: string[] | undefined): ReadonlySet<string> {
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const handled = useRef<string | null>(null);
  const signature = doneIds?.join(",");
  useEffect(() => {
    if (!packId || !doneIds) return;
    const key = `hunter.cleared.${packId}`;
    if (handled.current === key + signature) return;
    handled.current = key + signature;
    const seen = read<string[]>(key);
    write(key, doneIds);
    if (seen) setFresh(new Set(doneIds.filter((id) => !seen.includes(id))));
    // doneIds je opisan potpisom (signature); novi niz iste sadržine ne treba da pokrene efekat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId, signature]);
  return fresh;
}

// ---------- brojke koje se odbrojavaju (Sistem 2.0) ----------

/** Smanjeni pokreti: podešavanje u aplikaciji (data-motion) ILI sistemsko prefers-reduced-motion. */
function motionReduced() {
  return document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Prikazana vrednost koja se odbrojava do `value`. Prvi put kreće od `from` (npr. ono što je korisnik
 * poslednji put video), posle od trenutno prikazane. Uz smanjene pokrete odmah prikazuje `value`.
 * `delayMs` sačeka da se prozor otvori pre brojanja.
 */
export function useCountUp(value: number, from: number = value, delayMs = 300): number {
  const shownRef = useRef(from);
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const start = shownRef.current;
    const show = (v: number) => { shownRef.current = v; setShown(v); };
    if (start === value || motionReduced()) { show(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const v = countUpAt(start, value, now - t0 - delayMs);
      show(v);
      if (v !== value) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delayMs]);
  return shown;
}

/**
 * Brojke koje je korisnik poslednji put video na statusu (localStorage, kao rang), da bi se posle
 * završenog koraka XP i poeni odbrojali od stare vrednosti. Čita se jednom pri otvaranju stranice,
 * a upisuje svaki put kad stignu nove vrednosti. Bez zapisa (prvi put) nema odbrojavanja.
 */
export function useSeenNumbers<T extends object>(key: string, current: T): T | null {
  const [seen] = useState(() => read<T>(key));
  const signature = JSON.stringify(current);
  useEffect(() => {
    write(key, current);
    // current je opisan potpisom; novi objekat iste sadržine ne treba ponovo da se upisuje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, signature]);
  return seen;
}
