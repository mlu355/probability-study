#!/usr/bin/env bash
# Download course PDFs (exams, HW, sessions) + Dembo's notes into materials/ (gitignored) and extract text.
set -euo pipefail
cd "$(dirname "$0")/.."
B=https://web.stanford.edu/class/stats310a
mkdir -p materials
files=(lnotes.pdf
  FINAL/final2019.pdf FINAL/final2019_solutions.pdf FINAL/pract_final.pdf
  MIDTERM/midterm2026.pdf MIDTERM/midterm2026_solutions.pdf
  HW/midterm2017.pdf HW/midterm2017_solutions.pdf HW/practice_mid2012.pdf HW/practice_mid2012_sol.pdf
  HW/hw{1..8}.pdf SESSIONS.2026/session{1..5}.pdf)
for f in "${files[@]}"; do
  out="materials/${f//\//_}"
  curl -sfL "$B/$f" -o "$out" && echo "ok  $f" || echo "--  $f (missing)"
  command -v pdftotext >/dev/null && [ -f "$out" ] && pdftotext -layout "$out" "${out%.pdf}.txt" || true
done
