---
name: make-cards
description: Add flashcards/theorems/moves to app/data.js from a Dembo section, lecture, or the user's error log, then rebuild the Anki deck. Use when the user says "make cards for X" or wants their mistakes turned into cards.
---

1. Source: a Dembo section (`materials/lnotes.pdf`, use `pdftotext`), a topic id, or `progress/progress.json` → `errorLog`.
2. Prefer adding to existing arrays rather than free-form cards:
   - a theorem → `thms` entry `{ id: <Dembo number>, k, name, t, s }` (verify the number in the PDF),
   - a technique / recurring mistake → `moves` entry,
   - a proof → `proofs` entry with 3–5 `steps` and `traps`.
3. Keep statements exact and short; LaTeX via `R\`...\``.
4. Run `node -e "require('./app/data.js')"` and `python3 scripts/build_anki.py`. Report the count added. Remind: re-import `anki/stats310a.apkg` (Anki merges by GUID, no duplicates).
