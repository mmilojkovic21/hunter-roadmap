import { useEffect } from "react";
import { NavLink, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Icon } from "./Icon";

const NAV = [
  { to: "/", label: "Status", icon: "grid" },
  { to: "/map", label: "Mapa veština", icon: "map" },
  { to: "/library", label: "Biblioteka", icon: "book" },
  { to: "/settings", label: "Podešavanja", icon: "gear" },
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
  }, [settings.data]);

  return (
    <div className="app">
      <nav className="side" aria-label="Glavni meni">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <div className="brand-name">Hunter Roadmap</div>
            <div className="muted" style={{ fontSize: 12 }}>Sistem za učenje</div>
          </div>
        </div>
        <div className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
