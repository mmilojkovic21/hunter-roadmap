#!/usr/bin/env bash
# Razvoj bez Dockera za kod: baza u Dockeru, API (dotnet watch) i web (Vite) lokalno, sa automatskim osvežavanjem.
# Pokretanje: tools/dev.sh   →   http://localhost:5173   (Ctrl+C gasi API i web; baza ostaje da radi)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[ sistem ] baza na localhost:5433"
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
until docker compose exec -T db pg_isready -U hunter -d hunter >/dev/null 2>&1; do sleep 1; done

[ -d web/node_modules ] || (cd web && npm ci)

# Oba procesa rade u pozadini ovog skripta; Ctrl+C gasi oba, da ne ostane API koji drži port 8080.
trap 'kill 0' INT TERM EXIT
(cd api/src/Hunter.Api && dotnet watch --non-interactive) &
(cd web && npm run dev) &
wait
