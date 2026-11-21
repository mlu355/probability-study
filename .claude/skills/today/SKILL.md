---
name: today
description: Build today's adjusted study plan for the STATS 310A final from progress/progress.json, the error log and the base plan in app/data.js. Use when the user asks what to study today, says they're behind, or exported new progress.
---

1. Read `progress/progress.json` if it exists (else say "no export yet — using base plan") and the `plan`, `topics`, `moves`, `exams` arrays in `app/data.js`.
2. Compute: days left until 2026-12-10 08:30 PT; today's base plan entry; topics with lowest `mastery × weight`; error-log topics that repeat ≥2×; plan tasks from past days left undone.
3. Output **at most 12 lines**:
   - `T-minus Nd · readiness X%`
   - Today's 3–5 tasks, re-prioritised: carry over undone high-weight tasks, swap in a past-exam problem tagged with the weakest topic (give exam id + problem number), name 1 proof from the dojo.
   - One line: the single most likely-to-cost-points mistake from the error log and the fix.
4. If behind by ≥2 days, compress: drop weight-1 topics (I.3, III.1, III.5, IV.4) before anything else, never drop mocks.
5. Offer to write the adjusted day into `progress/today.md`. Don't edit `app/data.js` unless asked.
