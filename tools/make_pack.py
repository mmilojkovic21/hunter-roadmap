#!/usr/bin/env python3
"""Pravi Hunter paket (format hunter-pack/1) iz izlaza build_content.py + make_manifest.py.

Upotreba:
    python tools/make_pack.py <folder_sa_content_i_manifest> packs/fullstack-dotnet

Paket je folder (ili zip tog foldera) sa dva fajla:
    pack.json      metapodaci, statistike i struktura (regioni → nivoi → id-jevi poglavlja)
    chapters.json  sadržaj poglavlja
"""
import json
import sys
from pathlib import Path

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
manifest = json.loads((src / "manifest.json").read_text(encoding="utf-8"))
content = {c["id"]: c for c in json.loads((src / "content.json").read_text(encoding="utf-8"))["chapters"]}
guide_file = src / "guide.json"
guide = json.loads(guide_file.read_text(encoding="utf-8")) if guide_file.exists() else {}

STATS = [
    {"key": "INT", "name": "Osnove i web", "color": "#B9A4FF"},
    {"key": "STR", "name": "Backend · .NET", "color": "#7DBBFF"},
    {"key": "AGI", "name": "Frontend · React", "color": "#5FE0B7"},
    {"key": "VIT", "name": "DevOps i cloud", "color": "#FFB547"},
    {"key": "PER", "name": "Intervju", "color": "#FF9EC2"},
]

pack = {
    "format": "hunter-pack/1",
    "id": "fullstack-dotnet",
    "title": "Full Stack .NET inženjer",
    # Opis se računa iz sadržaja, jer poglavlja vodiča postepeno dobijaju punu lekciju u aplikaciji.
    "description": "Od nule do posla: .NET, React, DevOps, cloud, AI i priprema za intervju. "
                   f"49 poglavlja iz vodiča, od toga {sum('lessonMarkdown' in g for g in guide.values())} "
                   "sa punom lekcijom u aplikaciji (ostala: lekcija u PDF vodiču, test i pitanja ovde), "
                   "i 31 poglavlje dodataka.",
    "language": "sr-Latn",
    # Nova verzija: API pri startu ponovo uvozi paket samo kad se verzija promeni (PackImporter.SeedFromFolderAsync).
    "version": "1.2.2",
    "author": "Miljan",
    "passPct": manifest["passPct"],
    "xp": manifest["xp"],
    "stats": STATS,
    "regions": [],
}
chapters = []
for r in manifest["regions"]:
    region = {"code": r["code"], "title": r["title"], "stat": r["stat"], "levels": []}
    for lvl in r["levels"]:
        region["levels"].append({"name": lvl["name"], "chapters": [c["id"] for c in lvl["chapters"]]})
        for c in lvl["chapters"]:
            if c["source"] == "vodic":
                g = guide.get(c["id"], {"test": [], "cards": []})
                # Pun blok u vodic-*.md: lekcija je u aplikaciji, pa nema externalRef
                # (externalRef znači „lekcija je van aplikacije”, tako ga prikazuje i mapa i poglavlje).
                full = "lessonMarkdown" in g
                chapters.append({
                    "id": c["id"], "title": c["title"], "subtitle": g.get("subtitle", ""), "minutes": g.get("minutes", 30),
                    "externalRef": None if full else f"PDF vodič „Od nule do posla”, poglavlje {c['guideChapter']}",
                    "intro": g.get("intro", ""), "lessonMarkdown": g.get("lessonMarkdown", ""),
                    "deeperMarkdown": g.get("deeperMarkdown", ""),
                    "exercise": {"steps": g["lab"]["steps"], "done": g["lab"]["done"]} if full else None,
                    "cards": g["cards"], "test": g["test"], "sources": g.get("sources", []),
                })
            else:
                x = content[c["id"]]
                chapters.append({
                    "id": x["id"], "title": x["title"], "subtitle": x["subtitle"], "minutes": x["minutes"],
                    "externalRef": None,
                    "intro": x["intro"], "lessonMarkdown": x["lessonMarkdown"], "deeperMarkdown": x["deeperMarkdown"],
                    "exercise": {"steps": x["lab"]["steps"], "done": x["lab"]["done"]},
                    "cards": x["cards"], "test": x["test"], "sources": x["sources"],
                })
    pack["regions"].append(region)

dst.mkdir(parents=True, exist_ok=True)
(dst / "pack.json").write_text(json.dumps(pack, ensure_ascii=False, indent=2), encoding="utf-8")
(dst / "chapters.json").write_text(json.dumps(chapters, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"paket {pack['id']}: {len(pack['regions'])} regiona, {len(chapters)} poglavlja, "
      f"{sum(len(c['test']) for c in chapters)} pitanja")
