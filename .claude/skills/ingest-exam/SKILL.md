---
name: ingest-exam
description: Turn a past/practice exam or homework PDF into tagged problems, hints and playbook moves inside app/data.js. Use when the user adds a new exam PDF or URL, or says new practice material was posted.
---

1. Get the PDF: path under `materials/` or a URL on web.stanford.edu/class/stats310a (run `scripts/fetch_materials.sh` to refresh). Extract with `pdftotext -layout`. Also extract the solutions PDF if present.
2. For each problem, build an entry matching the `exams[].problems[]` schema in `app/data.js`:
   `{ n, pts, t: [topic ids], moves: [move ids], q, hints: [2–3 escalating], sol }` — LaTeX in `R\`...\``, statements condensed but faithful.
3. Tag `t` with the most specific topic ids; reuse existing `moves` where they fit. If a genuinely new technique appears, add a `moves` entry (`id, name, t, seen, when, how, cite`) — cite only Dembo numbers present in `thms` or verified in the lnotes PDF.
4. Append the exam to `exams`, add its id to the relevant `moves[].seen`, bump `topics[].w` if a topic now appears repeatedly.
5. Validate: `node -e "require('./app/data.js')"`, then `python3 scripts/build_anki.py`. Report: problems added, topics hit, new moves.
