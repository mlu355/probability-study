# stats310a://final-ops

Terminal-style study cockpit for the **STATS 310A / MATH 230A final** (Thu Dec 10, 8:30am, Montanari),
built from the course site, Dembo's lecture notes (class version), and Rosenthal's *A First Look at Rigorous Probability Theory*.

**Run:** open `index.html` (no build step, works offline). Press `1`–`0` to switch views, `/` for the command line, `space` to flip/reveal, `1`–`4` to grade.

| view | what it is |
|---|---|
| mission | countdown, today's tasks, weighted readiness, weakest branches |
| topic tree | 8 branches / 27 leaves, Dembo § + Rosenthal ch, exam yield, mastery bars |
| cite index | 84 Dembo theorems **by number** + citable HW exercises — the exam is open book and lets you cite by number. Printable. |
| playbook | 20 "moves": every past exam problem mapped to the technique that kills it |
| proof dojo | 16 core proofs, write first, then reveal step-by-step |
| drill | exam-aware spaced repetition (228 cards; intervals capped so everything resurfaces before Dec 10) |
| exam vault | Final 2019, Practice Final 2012, Midterm 2026 — timed, hint ladder, sketches, scoring |
| plan | Nov 21 → Dec 10 day-by-day |
| error log | mistakes by topic → feeds `/today` |

**Claude Code loop** (`.claude/skills/`): `/today` re-plans from your exported progress, `/grade-proof` grades `proofs/*.md`
with a Montanari-style rubric, `/drill` runs a Socratic oral exam, `/ingest-exam` turns a new PDF into tagged problems,
`/make-cards` adds content + rebuilds Anki.

**Anki:** `pip install genanki && python3 scripts/build_anki.py` → `anki/stats310a.apkg` (same IDs as the app).
**Materials:** `scripts/fetch_materials.sh` pulls all course PDFs + notes into `materials/` (gitignored).
