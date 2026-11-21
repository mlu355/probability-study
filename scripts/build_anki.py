#!/usr/bin/env python3
"""Build anki/stats310a.apkg from app/data.js (same card IDs as the web app's SRS).

    pip install genanki && python3 scripts/build_anki.py

LaTeX: Anki renders \\( ... \\) with MathJax, so $...$ is converted.
"""
import json, re, subprocess, hashlib, pathlib, html
import genanki

ROOT = pathlib.Path(__file__).resolve().parent.parent
data = json.loads(subprocess.check_output(
    ["node", "-e", "console.log(JSON.stringify(require('./app/data.js')))"], cwd=ROOT))

def tex(s: str) -> str:
    s = html.escape(s, quote=False)
    return re.sub(r"\$(.+?)\$", r"\\(\1\\)", s)

def stable_id(s: str) -> int:
    return int(hashlib.sha1(s.encode()).hexdigest()[:12], 16)

CSS = """.card{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:17px;background:#060807;color:#cdeed6;text-align:left;padding:18px}
.k{color:#5ef1ff}.d{color:#5d7a66}.a{color:#ffb347}.g{color:#39ff88}hr{border:0;border-top:1px dashed #1c2a21}"""
model = genanki.Model(stable_id("s310a-model-v1"), "STATS310A",
    fields=[{"name": "Front"}, {"name": "Back"}, {"name": "Id"}],
    templates=[{"name": "card", "qfmt": "{{Front}}", "afmt": "{{FrontSide}}<hr id=answer>{{Back}}"}], css=CSS)

topic = {t["id"]: t["title"] for t in data["topics"]}
decks = {}
def deck(name):
    if name not in decks:
        decks[name] = genanki.Deck(stable_id("s310a::" + name), f"STATS310A::{name}")
    return decks[name]

def add(dname, front, back, cid, tags):
    deck(dname).add_note(genanki.Note(model=model, fields=[front, back, cid], guid=genanki.guid_for(cid),
                                      tags=[re.sub(r"[^\w.-]", "_", t) for t in tags]))

for t in data["thms"]:
    tags = ["topic::" + t["t"]]
    add("1 Citation index", f"What does <b class=k>{t['id']}</b> say? <span class=d>({t['k']})</span>",
        f"<b class=a>{tex(t['name'])}</b><br>{tex(t['s'])}", "thm:" + t["id"], tags)
    add("2 Recall statements", f"State <b class=a>{tex(t['name'])}</b> + its Dembo number.",
        f"<span class=k>{t['id']}</span> — {tex(t['s'])}", "name:" + t["id"], tags)
for m in data["moves"]:
    add("3 Exam moves", f"<span class=d>EXAM SMELL:</span> {tex(m['when'])}<br><br>What's the move?",
        f"<b class=g>{tex(m['name'])}</b><br>{tex(m['how'])}<br><span class=d>cite: {', '.join(m['cite'])}</span>",
        "move:" + m["id"], ["topic::" + m["t"]] + ["seen::" + s for s in m["seen"]])
for p in data["proofs"]:
    steps = "".join(f"<li>{tex(s)}</li>" for s in p["steps"])
    add("4 Proof skeletons", f"<b class=a>{tex(p['title'])}</b> <span class=d>({p['cite']})</span><br>{tex(p['stmt'])}<br><br>Key idea + skeleton?",
        f"<i>{tex(p['idea'])}</i><ol>{steps}</ol>", "proof:" + p["id"], ["topic::" + p["t"]])
for h in data["hw"]:
    add("5 Citable homework", f"HW{h['hw']}: what does <b class=k>Exercise {h['ex']}</b> show?", tex(h["s"]), "hw:" + h["ex"], ["hw"])

out = ROOT / "anki" / "stats310a.apkg"
out.parent.mkdir(exist_ok=True)
genanki.Package(list(decks.values())).write_to_file(out)
print(f"wrote {out.relative_to(ROOT)}: {sum(len(d.notes) for d in decks.values())} notes in {len(decks)} decks")
