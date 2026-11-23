import { useId, type ReactNode } from "react";

/**
 * Prozor sistema (Sistem 2.0, kanvas „9 · Sistem 2.0”): staklena površina, dvostruki obris
 * (spoljni sjajni + unutrašnji tanki okvir) i naslovna traka sa uokvirenim „!” i razmaknutim naslovom.
 * Stil je u styles.css (`.win*`). `glass` uključuje zamućenje pozadine; samo za nekoliko velikih
 * prozora po ekranu, jer je backdrop-filter skup za iscrtavanje.
 * Naslov je pravi naslov (h1/h2), pa se po njemu imenuje sekcija i čitač ekrana ga najavljuje.
 */
export function Window({ title, level = 2, glass = false, badge = "!", className, children }: {
  title: string;
  /** Znak u naslovnoj traci: „!” za obaveštenja i zadatke, „i” za prozore sa podacima. */
  badge?: string;
  level?: 1 | 2;
  glass?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <section aria-labelledby={id} className={["win", glass && "win-glass", className].filter(Boolean).join(" ")}>
      <div className="win-head">
        <span className="win-badge" aria-hidden="true">{badge}</span>
        <Heading id={id} className="win-title">{title}</Heading>
      </div>
      <div className="win-body">{children}</div>
    </section>
  );
}
