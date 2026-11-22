import type { QueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import { CLOSE_MS, closeIn, GRANT_AT, okDelay, type BootMode } from "./lib/bootTiming";

/**
 * Upravlja boot ekranom iz index.html (faza 2, stavka 9). Overlay je običan HTML van React-a, pa se ovde
 * menja direktno kroz DOM. „OK” redovi prate STVARNO učitavanje: podaci se učitavaju kroz isti QueryClient
 * i ostaju u kešu, pa ih prva stranica ne traži ponovo. Overlay nestaje kad su podaci tu I prošlo je
 * najkraće trajanje, ili odmah na klik / Enter / Esc.
 */
export function runBoot(queryClient: QueryClient) {
  const el = document.getElementById("boot");
  if (!el) return;
  const overlay: HTMLElement = el;
  const mode = (document.documentElement.dataset.boot ?? "full") as BootMode;
  const start = (window as { __bootStart?: number }).__bootStart ?? performance.now();
  const elapsed = () => performance.now() - start;
  const errorBox = overlay.querySelector<HTMLElement>(".boot-error")!;
  let finished = false;
  let closeTimer: number | undefined;

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(closeTimer);
    window.removeEventListener("keydown", onKey);
    overlay.classList.add("boot-done");
    setTimeout(() => {
      overlay.remove();
      // Fokus ide na sadržaj, da tastatura i čitač ekrana krenu od stranice, a ne od praznog body-ja.
      document.querySelector<HTMLElement>("main")?.focus();
    }, CLOSE_MS[mode]);
  }

  function markOk(step: string) {
    const row = overlay.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (!row || row.classList.contains("ok")) return;
    const index = Number(row.style.getPropertyValue("--i"));
    row.style.setProperty("--ok-delay", `${okDelay(index, elapsed())}ms`);
    row.classList.add("ok");
  }

  // 404 znači „nema aktivnog paketa”: to nije kvar, stranica će ponuditi Biblioteku.
  const allow404 = (e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return;
    throw e;
  };

  async function load() {
    overlay.classList.remove("failed");
    errorBox.hidden = true;
    try {
      await Promise.all([
        queryClient.query({ queryKey: ["settings"], queryFn: api.settings }).then(() => markOk("rank")),
        queryClient.query({ queryKey: ["status"], queryFn: api.status }).catch(allow404)
          .then(() => { markOk("status"); markOk("quest"); }),
        queryClient.query({ queryKey: ["map"], queryFn: api.map }).catch(allow404).then(() => markOk("map")),
      ]);
    } catch {
      if (finished) return;
      overlay.classList.add("failed");
      errorBox.hidden = false;
      overlay.querySelector<HTMLButtonElement>(".boot-retry")?.focus();
      return;
    }
    if (finished) return;
    if (mode === "full") {
      overlay.querySelector<HTMLElement>(".boot-grant")!.style.setProperty("--grant-delay", `${Math.max(0, GRANT_AT - elapsed())}ms`);
      overlay.classList.add("granted");
    }
    closeTimer = window.setTimeout(finish, closeIn(mode, elapsed()));
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" || (e.key === "Enter" && !(e.target as HTMLElement).closest(".boot-retry"))) finish();
  }

  overlay.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".boot-retry")) {
      e.stopPropagation();
      void load();
      return;
    }
    if (!overlay.classList.contains("failed")) finish();
  });
  window.addEventListener("keydown", onKey);
  void load();
}
