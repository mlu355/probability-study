---
name: drill
description: Run a short Socratic oral exam on a STATS 310A topic (e.g. "/drill weak convergence", "/drill V.2", "/drill random"). Use when the user wants to be quizzed or to check understanding beyond flashcards.
---

1. Resolve the topic to ids in `app/data.js` `topics` (fuzzy match; "random" = weight-3 topic with lowest mastery in `progress/progress.json`, if present).
2. Ask **one question at a time**, 5 rounds, escalating:
   1. state a key theorem + its Dembo number,
   2. why a hypothesis is needed (counterexample),
   3. "what's the move?" on a problem stem taken from `exams` or `moves[].when`,
   4. next step in a proof from `proofs`,
   5. a fresh exam-style variant you invent (same move, new setting).
3. After each answer: ✓ / ✗ in one line + the fix. No lectures.
4. End with a 3-line summary: strong / weak / what to drill in the app (card ids like `move:tailsum`).
