---
name: grade-proof
description: Grade a written proof or exam solution for STATS 310A like a strict Montanari TA. Use when the user points at proofs/*.md, pastes a solution, or asks "is this proof right?".
---

Input: a file under `proofs/` (or pasted text) and, if identifiable, the matching item in `app/data.js` (`proofs`, or an `exams[].problems[]` entry).

Grade out of the problem's points (default 20) with this rubric, and be concrete — quote the line:
1. **Claim & structure** (2): states what is proved; both directions of an iff.
2. **Tool** (4): uses an appropriate result and **cites the Dembo number** (check it exists in `thms` or the class lnotes). Uncited non-elementary claims lose points.
3. **Hypotheses** (6): every hypothesis of each cited result is verified — independence (mutual vs pairwise), integrability/domination, finiteness of measures, π-system, continuity points, tightness.
4. **Rigor** (6): quantifiers, ε–δ, a.s. vs in probability, interchanging limits justified (MCT/DCT/Fatou/Fubini).
5. **Clarity** (2): concise, no irrelevant detours.

Output:
- `Score: x/20` and one line per rubric item.
- The **single most important fix**, rewritten as the correct line(s).
- The playbook move this problem uses (`moves[].id`).
- If score < 14, append one line to the user's error log suggestion: `topic-id — mistake` (they paste it into the app's error log).

Do not rewrite the whole proof unless asked.
