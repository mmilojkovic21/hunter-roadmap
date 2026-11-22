#!/usr/bin/env bash
# E2E testovi (Playwright) nad svežom Docker instancom na 127.0.0.1:8099. Glavna aplikacija (8088) i njena baza
# se ne diraju: poseban compose projekat sa svojim volumenom, koji se briše pre i posle testova.
# Pokretanje: tools/e2e.sh            (dodatni argumenti idu Playwright-u, npr. tools/e2e.sh --headed)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

# Apsolutne putanje: gašenje u trap-u radi i posle `cd web` niže.
compose=(docker compose -p hunter-e2e --project-directory "$root" -f "$root/docker-compose.yml" -f "$root/docker-compose.e2e.yml")
"${compose[@]}" down -v >/dev/null 2>&1 || true
trap '"${compose[@]}" down -v >/dev/null 2>&1' EXIT

echo "[ sistem ] podižem e2e instancu na http://127.0.0.1:8099"
"${compose[@]}" up --build -d
for _ in $(seq 1 60); do curl -sf http://127.0.0.1:8099/api/health >/dev/null && break; sleep 2; done
curl -sf http://127.0.0.1:8099/api/health >/dev/null || { echo "[ greška ] API nije proradio"; "${compose[@]}" logs api | tail -30; exit 1; }

cd "$root/web"
E2E_BASE_URL=http://127.0.0.1:8099 npx playwright test "$@"
