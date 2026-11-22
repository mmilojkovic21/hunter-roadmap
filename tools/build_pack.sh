#!/usr/bin/env bash
# Iz izvornih .md fajlova pravi paket u packs/<id>. Upotreba: tools/build_pack.sh fullstack-dotnet
set -euo pipefail
name="${1:-fullstack-dotnet}"
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/content/$name/out"
python3 "$root/tools/build_content.py" "$root/content/$name/src" "$out"
python3 "$root/tools/make_manifest.py" "$out"
python3 "$root/tools/make_pack.py" "$out" "$root/packs/$name"
