import { Suspense, useEffect } from "react";
import { NavLink, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Loading } from "./common";

const NAV = [
  { to: "/", label: "Status" },
  { to: "/map", label: "Mapa veština" },
  { to: "/library", label: "Biblioteka" },
  { to: "/settings", label: "Podešavanja" },
] as const;

export function Layout() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });

  // Tema i sjaj se primenjuju na <html>, pa ih koriste svi ekrani (styles.css).
  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    const root = document.documentElement;
    root.dataset.theme = s.theme;
    root.dataset.glow = s.glow ? "on" : "off";
    root.dataset.motion = s.reduceMotion ? "reduce" : "full";
    root.dataset.scan = s.scanLines ? "on" : "off";
    // Keš za boot ekran (index.html): pri sledećem učitavanju tema i animacije važe pre nego što API odgovori.
    try {
      localStorage.setItem("hunter.settings", JSON.stringify({ theme: s.theme, glow: s.glow, reduceMotion: s.reduceMotion, scanLines: s.scanLines }));
    } catch {
      /* bez keša boot koristi podrazumevanu temu */
    }
  }, [settings.data]);

  return (
    <div className="app">
      {/* Pozadina kao scena (Sistem 2.0): mreža koja klizi, vinjeta, scan linije. Samo dekor, ne prima klikove. */}
      <div className="scene" aria-hidden="true">
        <div className="scene-grid" />
        <div className="scene-vignette" />
        <div className="scene-scan" />
      </div>
      <nav className="side" aria-label="Glavni meni">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <div className="brand-name">Hunter Roadmap</div>
            <div className="brand-sub">Sistem za učenje</div>
          </div>
        </div>
        <div className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {/* ▸ označava aktivnu stavku; čitač ekrana to dobija iz aria-current koji NavLink postavlja. */}
              <span className="nav-mark" aria-hidden="true">▸</span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
      {/* tabIndex -1: boot ekran posle nestanka prebacuje fokus ovde (programski, ne tabom). */}
      <main className="main" tabIndex={-1}>
        {/* Stranice su lazy: dok se deo bundle-a preuzima, meni ostaje, a umesto sadržaja ide Loading. */}
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
