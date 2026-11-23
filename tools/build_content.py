#!/usr/bin/env python3
"""Hunter Roadmap: pretvara izvorne .md fajlove regiona u fajlove poglavlja i JSON za seed baze.

Upotreba:
    python build_content.py <src_folder> <out_folder>

Ulaz:  <src_folder>/region-*.md, poglavlja odvojena linijom "=====".
       <src_folder>/vodic-*.md, test i pitanja sa intervjua za poglavlja iz PDF vodiča (lekcija je u vodiču).
Izlaz: <out_folder>/chapters/<id>-<slug>.md   (jedno poglavlje, čitljivo)
       <out_folder>/content.json               (sva poglavlja, struktura za API seed)
       <out_folder>/guide.json                 (id poglavlja vodiča → test i kartice)
Skripta pada sa porukom ako poglavlje ne prati format (vidi validate()).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

REQUIRED_SECTIONS = ["Pojmovi", "Lab", "Pitanja sa intervjua", "Test", "Izvori"]


def slugify(text: str) -> str:
    repl = {"č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "dj"}
    t = "".join(repl.get(c, c) for c in text.lower())
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def parse_frontmatter(block: str):
    m = re.match(r"\s*---\n(.*?)\n---\n(.*)", block, re.S)
    if not m:
        raise ValueError("nema frontmatter-a")
    meta = {}
    for line in m.group(1).splitlines():
        k, v = line.split(":", 1)
        v = v.strip()
        meta[k.strip()] = int(v) if v.isdigit() else v.strip('"')
    return meta, m.group(2).strip() + "\n"


def split_sections(body: str):
    parts = re.split(r"^## (.+)$", body, flags=re.M)
    intro = parts[0]
    sections = {parts[i].strip(): parts[i + 1].strip() for i in range(1, len(parts), 2)}
    return intro, sections


def parse_test(text: str):
    questions = []
    for chunk in re.split(r"^### ", text, flags=re.M)[1:]:
        lines = chunk.strip().splitlines()
        q = {"text": re.sub(r"^\d+\.\s*", "", lines[0]).strip(), "code": None, "options": [], "correct": None, "why": ""}
        code, in_code = [], False
        for ln in lines[1:]:
            if ln.startswith("```"):
                in_code = not in_code
                if not in_code:
                    q["code"] = "\n".join(code)
                continue
            if in_code:
                code.append(ln)
            elif ln.startswith("- [x] ") or ln.startswith("- [ ] "):
                if ln.startswith("- [x] "):
                    if q["correct"] is not None:
                        raise ValueError(f"više tačnih odgovora: {q['text']}")
                    q["correct"] = len(q["options"])
                q["options"].append(ln[6:].strip())
            elif ln.startswith("> "):
                q["why"] = ln[2:].strip()
        questions.append(q)
    return questions


def parse_interview(text: str):
    cards = []
    for m in re.finditer(r"\*\*P: (.+?)\*\*\n(.+?)(?=\n\*\*P: |\Z)", text, re.S):
        cards.append({"q": m.group(1).strip(), "a": " ".join(m.group(2).split())})
    return cards


def parse_lab(text: str):
    steps = [re.sub(r"^\d+\.\s*", "", ln).strip() for ln in text.splitlines() if re.match(r"^\d+\.\s", ln)]
    done = re.search(r"\*\*Gotovo je kad:\*\*\s*(.+)", text, re.S)
    return {"steps": steps, "done": " ".join(done.group(1).split()) if done else ""}


def parse_sources(text: str):
    return [{"title": t, "url": u} for t, u in re.findall(r"\[(.+?)\]\((https?://[^)]+)\)", text)]


def validate_quiz(ch, errs):
    """Pravila za test i kartice; ista za poglavlja dodataka i za poglavlja vodiča."""
    if len(ch["test"]) != 5:
        errs.append(f"test ima {len(ch['test'])} pitanja, treba 5")
    for q in ch["test"]:
        if len(q["options"]) != 4:
            errs.append(f"pitanje nema 4 opcije: {q['text']}")
        if q["correct"] is None:
            errs.append(f"pitanje nema tačan odgovor: {q['text']}")
        if not q["why"]:
            errs.append(f"pitanje nema objašnjenje: {q['text']}")
    if len(ch["cards"]) < 2:
        errs.append("manje od 2 pitanja sa intervjua")
    cyr = [c for c in ch["_raw"] if "Ѐ" <= c <= "ӿ"]
    if cyr:
        errs.append(f"ćirilična slova u tekstu: {''.join(sorted(set(cyr)))}")


def validate(ch):
    errs = []
    for s in REQUIRED_SECTIONS:
        if s not in ch["_sections"]:
            errs.append(f"nema sekcije '{s}'")
    validate_quiz(ch, errs)
    if len(ch["lab"]["steps"]) < 3 or not ch["lab"]["done"]:
        errs.append("lab nema bar 3 koraka i 'Gotovo je kad'")
    if not ch["sources"]:
        errs.append("nema izvora")
    if errs:
        raise ValueError(f"{ch['id']} {ch['title']}: " + "; ".join(errs))


def main(src: Path, out: Path):
    (out / "chapters").mkdir(parents=True, exist_ok=True)
    chapters = []
    for f in sorted(src.glob("region-*.md")):
        for block in f.read_text(encoding="utf-8").split("=====\n"):
            if not block.strip():
                continue
            meta, body = parse_frontmatter(block)
            intro, sections = split_sections(body)
            ch = {
                **meta,
                "intro": "\n".join(l for l in intro.splitlines() if not l.startswith("# ")).strip(),
                "lessonMarkdown": sections.get("Pojmovi", ""),
                "deeperMarkdown": sections.get("Dublje", ""),
                "lab": parse_lab(sections.get("Lab", "")),
                "cards": parse_interview(sections.get("Pitanja sa intervjua", "")),
                "test": parse_test(sections.get("Test", "")),
                "sources": parse_sources(sections.get("Izvori", "")),
                "file": f"chapters/{meta['id']}-{slugify(meta['title'])}.md",
                "_sections": sections,
                "_raw": block,
            }
            validate(ch)
            (out / ch["file"]).write_text(block.strip() + "\n", encoding="utf-8")
            chapters.append(ch)
    for ch in chapters:
        del ch["_sections"], ch["_raw"]

    # Poglavlja iz PDF vodiča. Blok sa sekcijom "Pojmovi" je pun (lekcija, vežba, izvori) i prolazi
    # istu proveru kao regioni; blok bez nje ima samo test i pitanja, a lekcija ostaje u PDF-u.
    guide = {}
    for f in sorted(src.glob("vodic-*.md")):
        for block in f.read_text(encoding="utf-8").split("=====\n"):
            if not block.strip():
                continue
            meta, body = parse_frontmatter(block)
            intro, sections = split_sections(body)
            ch = {"id": str(meta["id"]), "title": meta.get("title", f"vodič {meta['id']}"),
                  "test": parse_test(sections.get("Test", "")),
                  "cards": parse_interview(sections.get("Pitanja sa intervjua", "")), "_raw": block}
            full = "Pojmovi" in sections
            if full:
                ch.update({
                    "subtitle": meta.get("subtitle", ""), "minutes": meta.get("minutes", 30),
                    "intro": "\n".join(l for l in intro.splitlines() if not l.startswith("# ")).strip(),
                    "lessonMarkdown": sections["Pojmovi"], "deeperMarkdown": sections.get("Dublje", ""),
                    "lab": parse_lab(sections.get("Lab", "")), "sources": parse_sources(sections.get("Izvori", "")),
                    "_sections": sections,
                })
            try:
                if full:
                    validate(ch)
                else:
                    errs = []
                    validate_quiz(ch, errs)
                    if errs:
                        raise ValueError("; ".join(errs))
                if ch["id"] in guide:
                    raise ValueError("poglavlje se ponavlja")
            except ValueError as e:
                raise ValueError(f"vodič, poglavlje {ch['id']} ({f.name}): {e}") from None
            keys = ["test", "cards"] + (["subtitle", "minutes", "intro", "lessonMarkdown", "deeperMarkdown", "lab", "sources"] if full else [])
            guide[ch["id"]] = {k: ch[k] for k in keys}
    (out / "guide.json").write_text(json.dumps(guide, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "content.json").write_text(json.dumps({"chapters": chapters}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(chapters)} poglavlja, {sum(len(c['test']) for c in chapters)} test pitanja, "
          f"{sum(len(c['cards']) for c in chapters)} kartica; vodič: {len(guide)} poglavlja, "
          f"{sum(len(g['test']) for g in guide.values())} test pitanja")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
