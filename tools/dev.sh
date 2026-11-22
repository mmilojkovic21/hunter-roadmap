#!/usr/bin/env bash
# Razvoj bez Dockera za kod: baza u Dockeru, API (dotnet watch) i web (Vite) lokalno, sa automatskim osvežavanjem.
# Pokretanje: tools/dev.sh   →   http://localhost:5173   (Ctrl+C gasi API i web; baza ostaje da radi)
set -euo pipefail
cd "$(dirname "$0")/.."

# API mora da dobije 8080 (Vite tamo šalje /api). Najčešći uzrok zauzetog porta je zaostali `dotnet watch`.
if pid=$(lsof -nP -iTCP:8080 -sTCP:LISTEN -t 2>/dev/null | head -1) && [ -n "$pid" ]; then
  echo "[ greška ] port 8080 je zauzet: $(ps -o command= -p "$pid" | cut -c1-80) (PID $pid)"
  echo "           ugasi ga sa: kill $pid   pa pokreni ponovo"
  exit 1
fi

echo "[ sistem ] baza na localhost:5433"
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
until docker compose exec -T db pg_isready -U hunter -d hunter >/dev/null 2>&1; do sleep 1; done

[ -d web/node_modules ] || (cd web && npm ci)

# Oba procesa ostaju u grupi terminala, da `dotnet watch` može da čita tastaturu (Ctrl+R = restart API-ja).
# Vite ne dobija tastaturu (</dev/null), da se dva procesa ne otimaju za pritisnute tastere.
(cd api/src/Hunter.Api && exec dotnet watch --non-interactive) &
(cd web && exec npm run dev </dev/null) &

# Pri izlasku: TERM celoj grupi (skript ga ignoriše), pa KILL posle 2 s. `dotnet watch` ne izlazi uvek
# na INT/TERM, a „siroče” koje ostane prati fajlove i pri sledećoj izmeni ponovo zauzme port 8080.
stop() {
  trap '' INT TERM
  trap - EXIT
  echo "[ sistem ] gasim API i web"
  kill -TERM 0 2>/dev/null || true
  sleep 2
  kill -KILL 0 2>/dev/null || true
}
trap stop INT TERM EXIT
wait
