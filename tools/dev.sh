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

# Svaki proces dobija svoju grupu (set -m), pa se pri izlasku gasi cela grupa: dotnet watch, njegov build i API.
# `dotnet watch` ne izlazi uvek na TERM, pa posle 2 s ide KILL. Inače ostaje „siroče” koje prati fajlove
# i pri sledećoj izmeni ponovo zauzme port 8080.
set -m
(cd api/src/Hunter.Api && exec dotnet watch --non-interactive) &
api=$!
(cd web && exec npm run dev) &
web=$!

stop() {
  trap - INT TERM EXIT
  kill -TERM -- "-$api" "-$web" 2>/dev/null || true
  sleep 2
  kill -KILL -- "-$api" "-$web" 2>/dev/null || true
}
trap stop INT TERM EXIT
wait
