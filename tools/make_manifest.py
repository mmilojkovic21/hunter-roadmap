#!/usr/bin/env python3
"""Pravi manifest.json: redosled regiona i svih 80 poglavlja (49 iz vodiča + 31 dodato)."""
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
content = json.loads((out / "content.json").read_text(encoding="utf-8"))
added = {c["id"]: c for c in content["chapters"]}

G = "vodic"  # poglavlje je u PDF vodiču „Od nule do posla”
regions = [
    ("0", "Deo 0 · Programiranje od nule", "INT", [("TEMELJI", ["0.1", "0.2", "0.3", "0.4"]), ("SREDNJI NIVO", ["0.5", "0.6", "0.7"]), ("NAPREDNI NIVO", ["0.8", "0.9"])]),
    ("I", "Deo I · Zajedničke osnove", "INT", [("TEMELJI", [(1, "Kako radi web aplikacija"), (2, "HTTP i REST")])]),
    ("II", "Deo II · Backend: .NET", "STR", [
        ("TEMELJI", [(3, ".NET platforma i alati"), (4, "C# osnove"), (5, "Objektno programiranje"), (6, "Kolekcije, generici, LINQ"), (7, "Izuzeci, resursi, async")]),
        ("SREDNJI NIVO", [(8, "ASP.NET Core"), (9, "Dependency Injection"), (10, "Middleware i filteri"), (11, "Web API"), (12, "SQL i EF Core")]),
        ("NAPREDNI NIVO", [(13, "Arhitektura i SOLID"), (14, "Transakcije i konkurentnost"), (15, "Bezbednost"), (16, "Integracije i pozadinski poslovi"), (17, "Testiranje")]),
        ("KROZ ZALIHE", [(18, ".NET u Zalihama"), (19, "Podsetnik: .NET")])]),
    ("III", "Deo III · Frontend: React", "AGI", [
        ("TEMELJI", [(20, "HTML, CSS i DOM"), (21, "JavaScript"), (22, "TypeScript"), (23, "React osnove")]),
        ("SREDNJI NIVO", [(24, "Hookovi"), (25, "Podaci sa servera"), (26, "Rutiranje"), (27, "Forme i jezici")]),
        ("NAPREDNI NIVO", [(28, "Arhitektura frontenda"), (29, "Build i testovi")]),
        ("KROZ ZALIHE", [(30, "React u Zalihama"), (31, "Podsetnik: React")])]),
    ("IV", "Deo IV · DevOps", "VIT", [
        ("TEMELJI", [(32, "Linux i terminal"), (33, "Mreža"), (34, "Git")]),
        ("SREDNJI NIVO", [(35, "Docker"), (36, "Docker Compose"), (37, "Server i HTTPS")]),
        ("NAPREDNI NIVO", [(38, "CI/CD i isporuka"), (39, "Rad u produkciji")]),
        ("KROZ ZALIHE", [(40, "DevOps u Zalihama"), (41, "Podsetnik: DevOps")])]),
    ("V", "Deo V · Sve zajedno", "PER", [("KROZ ZALIHE", [(42, "Jedna prodaja kroz ceo sistem"), (43, "Kako ispričati projekat")])]),
    ("VI", "Deo VI · Priprema za intervju", "PER", [("BOSS ZONA", [(44, "Sistem dizajn i skaliranje"), (45, ".NET: zamke"), (46, "JavaScript i React: zamke"), (47, "SQL i zadaci na tabli"), (48, "Tok intervjua i plan pripreme"), (49, "Rečnik")])]),
    ("C", "Dodatak C · Cloud i infrastruktura", "VIT", [("SREDNJI NIVO", ["C1", "C2", "C3", "C4"]), ("NAPREDNI NIVO", ["C5", "C6", "C7", "C8"])]),
    ("AI", "Dodatak AI · AI u razvoju i u proizvodu", "INT", [("TEMELJI", ["AI1", "AI2"]), ("NAPREDNI NIVO", ["AI3", "AI4", "AI5"])]),
    ("PRO", "Dodatak PRO · Veštine koje dele juniora od mediora", "PER", [("KVALITET", ["P1", "P2", "P3", "P4"]), ("FRONTEND+", ["P5", "P6", "P7"]), ("TIM I KARIJERA", ["P8", "P9"])]),
]

manifest, order, used = {"xp": {"lesson": 50, "deeper": 30, "lab": 100, "test": 80, "boss": 500}, "passPct": 70, "bossPassPct": 80, "regions": []}, 0, set()
for code, title, stat, levels in regions:
    r = {"code": code, "title": title, "stat": stat, "levels": []}
    for lvl, items in levels:
        chapters = []
        for it in items:
            order += 1
            if isinstance(it, tuple):
                chapters.append({"id": str(it[0]), "title": it[1], "source": G, "guideChapter": it[0], "order": order})
            else:
                c = added[it]
                used.add(it)
                chapters.append({"id": it, "title": c["title"], "source": "dodatak", "file": c["file"], "order": order})
        r["levels"].append({"name": lvl, "chapters": chapters})
    manifest["regions"].append(r)

missing = set(added) - used
assert not missing, f"poglavlja van manifesta: {missing}"
assert order == 80, order
(out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"manifest: {len(regions)} regiona, {order} poglavlja ({len(used)} dodatih)")
