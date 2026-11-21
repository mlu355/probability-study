/* stats310a://final-ops — engine. No build step, no deps (KaTeX via CDN). State in localStorage. */
(() => {
"use strict";
const D = window.DATA;
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const DAY = 864e5;
const EXAM = new Date(D.meta.examStart);
const KEY = "s310a.v1";

// ───────────── state ─────────────
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const S = Object.assign({ srs: {}, self: {}, tasks: {}, log: [], scores: {}, theme: "green", seen: 0, streak: { last: "", n: 0 } },
  JSON.parse(store.get(KEY) || "{}"));
const save = () => store.set(KEY, JSON.stringify(S));
const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
const daysLeft = () => Math.max(0, (EXAM - Date.now()) / DAY);

// ───────────── items for spaced repetition ─────────────
// Every theorem, move, proof and HW exercise becomes a card. Same IDs used by the Anki exporter.
const ITEMS = [];
D.thms.forEach(t => {
  ITEMS.push({ id: "thm:" + t.id, t: t.t, kind: "cite", front: `What does <b>${esc(t.id)}</b> say? <span class="d">(${esc(t.k)})</span>`, back: `<b>${esc(t.name)}</b><br>${esc(t.s)}` });
  ITEMS.push({ id: "name:" + t.id, t: t.t, kind: "recall", front: `State <b>${esc(t.name)}</b> and its Dembo number.`, back: `<span class="c">${esc(t.id)}</span> — ${esc(t.s)}` });
});
D.moves.forEach(m => ITEMS.push({ id: "move:" + m.id, t: m.t, kind: "move", front: `<span class="d">EXAM SMELL:</span> ${esc(m.when)}<br><br>What's the move?`, back: `<b>${esc(m.name)}</b><br>${esc(m.how)}<br><span class="d">cite: ${m.cite.map(esc).join(", ")}</span>` }));
D.proofs.forEach(p => ITEMS.push({ id: "proof:" + p.id, t: p.t, kind: "proof", front: `<b>${esc(p.title)}</b> <span class="d">(${esc(p.cite)})</span><br>${esc(p.stmt)}<br><br>Key idea + skeleton?`, back: `<i>${esc(p.idea)}</i><ol>${p.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` }));
D.hw.forEach(h => ITEMS.push({ id: "hw:" + h.ex, t: null, kind: "hw", front: `HW${h.hw}: what does <b>Exercise ${esc(h.ex)}</b> show? (citable!)`, back: esc(h.s) }));
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));

// SM-2 variant, exam-aware: intervals are capped so everything resurfaces before Dec 10.
function grade(id, q) { // q: 1 again, 2 hard, 3 good, 4 easy
  const s = S.srs[id] || { ef: 2.5, iv: 0, reps: 0, lapses: 0, due: 0 };
  const now = Date.now();
  if (q === 1) { s.reps = 0; s.lapses++; s.iv = 0; s.due = now + 10 * 60e3; s.ef = Math.max(1.3, s.ef - 0.2); }
  else {
    s.reps++;
    s.iv = s.reps === 1 ? (q === 4 ? 3 : 1) : s.reps === 2 ? (q === 2 ? 2 : 4) : Math.round(s.iv * s.ef * (q === 2 ? 0.7 : q === 4 ? 1.3 : 1));
    s.ef = Math.max(1.3, s.ef + (q === 2 ? -0.15 : q === 4 ? 0.1 : 0));
    const cap = Math.max(1, Math.floor(daysLeft() / 2.5));
    s.iv = Math.min(s.iv, cap);
    s.due = now + s.iv * DAY;
  }
  s.last = now; S.srs[id] = s;
  bumpStreak(); save();
}
const isDue = id => { const s = S.srs[id]; return !s || s.due <= Date.now(); };
const strength = id => { const s = S.srs[id]; if (!s || !s.reps) return 0; return Math.min(1, (s.iv + 1) / 8) * (s.lapses > 2 ? .7 : 1); };
function bumpStreak() {
  const t = today(); if (S.streak.last === t) return;
  const y = new Date(Date.now() - DAY).toLocaleDateString("en-CA");
  S.streak.n = S.streak.last === y ? S.streak.n + 1 : 1; S.streak.last = t;
}

// ───────────── mastery ─────────────
const leaves = D.topics.filter(t => t.parent);
const kids = id => D.topics.filter(t => t.parent === id);
function mastery(tid) {
  const t = D.topics.find(x => x.id === tid);
  if (!t.parent) { const k = kids(tid); return k.reduce((a, c) => a + mastery(c.id), 0) / k.length; }
  const its = ITEMS.filter(i => i.t === tid);
  const auto = its.length ? its.reduce((a, i) => a + strength(i.id), 0) / its.length : 0;
  const self = (S.self[tid] ?? 0) / 3;
  return its.length ? 0.6 * auto + 0.4 * self : self;
}
function readiness() {
  let w = 0, m = 0; leaves.forEach(t => { w += t.w; m += t.w * mastery(t.id); }); return m / w;
}
const bar = (x, n = 12) => { const f = Math.round(x * n); return `<span class="bar">${"█".repeat(f)}<span class="e">${"░".repeat(n - f)}</span></span>`; };
const stars = w => `<span class="a">${"★".repeat(w)}</span><span class="d">${"☆".repeat(3 - w)}</span>`;

// ───────────── rendering helpers ─────────────
function math(el) {
  if (window.renderMathInElement) renderMathInElement(el, { delimiters: [{ left: "$", right: "$", display: false }], throwOnError: false });
}
const view = $("#view");
function paint(html) { view.innerHTML = html; math(view); view.scrollTop = 0; view.focus({ preventScroll: true }); }
const topicName = id => (D.topics.find(t => t.id === id) || {}).title || id;
const citeTag = id => `<span class="tag cite" data-cite="${esc(id)}">${esc(id)}</span>`;

// ───────────── views ─────────────
const VIEWS = {};
let current = "mission", arg = null;

VIEWS.mission = () => {
  const t = today();
  const idx = D.plan.findIndex(p => p.d === t);
  const di = idx >= 0 ? idx : (t < D.plan[0].d ? 0 : D.plan.length - 1);
  const day = D.plan[di];
  const due = ITEMS.filter(i => isDue(i.id)).length;
  const done = D.plan.slice(0, di).reduce((a, p, i) => a + p.tasks.filter((_, j) => S.tasks[p.d + ":" + j]).length, 0);
  const total = D.plan.slice(0, di).reduce((a, p) => a + p.tasks.length, 0);
  const weak = [...leaves].sort((a, b) => (mastery(a.id) - a.w * .1) - (mastery(b.id) - b.w * .1)).slice(0, 4);
  paint(`
<pre class="ascii">
 ███████╗████████╗ █████╗ ████████╗███████╗    ██████╗  ██╗ ██████╗  █████╗
 ██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝    ╚════██╗███║██╔═████╗██╔══██╗
 ███████╗   ██║   ███████║   ██║   ███████╗     █████╔╝╚██║██║██╔██║███████║
 ╚════██║   ██║   ██╔══██║   ██║   ╚════██║     ╚═══██╗ ██║████╔╝██║██╔══██║
 ███████║   ██║   ██║  ██║   ██║   ███████║    ██████╔╝ ██║╚██████╔╝██║  ██║
 ╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝    ╚═════╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝  <span class="a">FINAL OPS</span></pre>
<div class="grid g4">
  <div class="panel tl" data-t="exam"><div class="lbl">Thu Dec 10 · 08:30</div><div class="big" id="bigT">--</div></div>
  <div class="panel tl" data-t="readiness"><div class="lbl">weighted mastery</div><div class="stat">${Math.round(readiness() * 100)}%</div>${bar(readiness(), 16)}</div>
  <div class="panel tl" data-t="queue"><div class="lbl">cards due now</div><div class="stat c">${due}</div><span class="d">${ITEMS.length} total · <a href="#" data-go="drill">drill →</a></span></div>
  <div class="panel tl" data-t="streak"><div class="lbl">day streak</div><div class="stat a">${S.streak.n}</div><span class="d">plan: ${done}/${total} past tasks</span></div>
</div>
<div class="grid g2">
  <div class="panel tl" data-t="today // ${esc(day.d)}">
    <h2>[${esc(day.tag)}] ${esc(day.title)}</h2>
    <ul class="tasks">${day.tasks.map((x, j) => `<li data-task="${day.d}:${j}" class="${S.tasks[day.d + ":" + j] ? "done" : ""}">${esc(x)}</li>`).join("")}</ul>
    <div class="mt small d">day ${di + 1}/${D.plan.length} · <a href="#" data-go="plan">full plan →</a></div>
  </div>
  <div class="panel tl" data-t="weakest branches (weighted by exam yield)">
    ${weak.map(t => `<div>${bar(mastery(t.id), 10)} <span class="c">${t.id}</span> ${esc(t.title)} ${stars(t.w)}</div>`).join("")}
    <div class="mt small d">rate yourself in <a href="#" data-go="tree">tree</a> · drill moves the bars</div>
  </div>
</div>
<div class="grid g2">
  <div class="panel tl" data-t="intel">${D.meta.intel.map(x => `<div>› ${esc(x)}</div>`).join("")}</div>
  <div class="panel tl" data-t="rules of engagement">${D.meta.rules.map(x => `<div><span class="a">!</span> ${esc(x)}</div>`).join("")}
    <div class="mt small d">${esc(D.meta.grading)} · <a href="${D.meta.site}" target="_blank">course site</a> · <a href="${D.meta.notes}" target="_blank">Dembo notes (class version)</a></div></div>
</div>`);
};

VIEWS.tree = () => {
  const roots = D.topics.filter(t => !t.parent);
  const pad = (s, n) => s + " " + "·".repeat(Math.max(2, n - s.length));
  let out = `<span class="g">stats310a/</span>  <span class="d">mastery          yield  dembo · rosenthal</span>\n`;
  roots.forEach((r, ri) => {
    const lastR = ri === roots.length - 1;
    out += `<span class="node" data-node="${r.id}">${lastR ? "└──" : "├──"} <span class="tt a">${esc(pad(r.id + " " + r.title, 58))}</span> ${bar(mastery(r.id))} ${stars(r.w)}  <span class="d">§${esc(r.dembo)} · R ${esc(r.ros)}</span></span>\n`;
    const ks = kids(r.id);
    ks.forEach((k, ki) => {
      const lastK = ki === ks.length - 1;
      const pre = (lastR ? "    " : "│   ") + (lastK ? "└──" : "├──");
      const hot = D.exams.some(e => e.problems.some(p => p.t.includes(k.id)));
      out += `<span class="node" data-node="${k.id}">${pre} <span class="tt">${esc(pad(k.id + " " + k.title, 54))}</span> ${bar(mastery(k.id))} ${stars(k.w)} ${hot ? '<span class="r">◆</span>' : " "} <span class="d">§${esc(k.dembo)} · R ${esc(k.ros)}</span></span>`;
      if (arg === k.id) out += nodeDetail(k);
      out += "\n";
    });
  });
  paint(`<h1>topic tree</h1><div class="small d" style="margin-bottom:10px">click a node to open · <span class="r">◆</span> = appeared on a past exam · ★ = exam yield · bars = 60% drill strength + 40% self-rating</div><div class="panel"><div class="tree">${out}</div></div>`);
};
function nodeDetail(k) {
  const th = D.thms.filter(t => t.t === k.id), mv = D.moves.filter(m => m.t === k.id), pf = D.proofs.filter(p => p.t === k.id);
  const pr = []; D.exams.forEach(e => e.problems.forEach(p => { if (p.t.includes(k.id)) pr.push(`${e.id}.${p.n}`); }));
  return `<span class="open">
<div>${esc(k.gist || "")}</div>
<div class="mt"><span class="d">self-rate:</span> ${[0, 1, 2, 3].map(v => `<button class="btn ${S.self[k.id] === v ? "pri" : ""}" data-self="${k.id}:${v}">${["?? lost", "shaky", "ok", "solid"][v]}</button>`).join("")}</div>
${th.length ? `<div class="mt"><span class="d">cite:</span> ${th.map(t => citeTag(t.id) + `<span class="small">${esc(t.name)}</span>`).join(" ")}</div>` : ""}
${mv.length ? `<div class="mt"><span class="d">moves:</span> ${mv.map(m => `<a href="#" data-go="play" data-arg="${m.id}">${esc(m.name)}</a>`).join(" · ")}</div>` : ""}
${pf.length ? `<div class="mt"><span class="d">proofs:</span> ${pf.map(p => `<a href="#" data-go="dojo" data-arg="${p.id}">${esc(p.title)}</a>`).join(" · ")}</div>` : ""}
${pr.length ? `<div class="mt"><span class="d">exam problems:</span> ${pr.map(x => `<a href="#" data-go="vault" data-arg="${x.split(".")[0]}">${x}</a>`).join(" · ")}</div>` : ""}
</span>`;
}

VIEWS.cite = () => {
  paint(`<h1>citation index</h1>
<div class="small d">Open book + cite-by-number. This is your weapon. Search by number, name or keyword. <button class="btn noprint" id="printc">print cheat sheet</button></div>
<input class="search mt noprint" id="cq" placeholder="e.g. tight · 1.4 · indep · fatou · weak" value="${esc(arg || "")}">
<div class="panel mt" id="clist"></div>`);
  const draw = () => {
    const q = $("#cq").value.toLowerCase().trim();
    const rows = D.thms.filter(t => !q || (t.id + " " + t.name + " " + t.s + " " + topicName(t.t)).toLowerCase().includes(q));
    const hw = D.hw.filter(h => !q || (h.ex + " hw " + h.s).toLowerCase().includes(q));
    $("#clist").innerHTML = rows.map(t => `<div class="row"><span class="id">${esc(t.id)}</span><span class="k">${esc(t.k)}</span><span><b>${esc(t.name)}</b> — ${esc(t.s)}</span></div>`).join("")
      + (hw.length ? `<h3 class="mt">citable homework</h3>` + hw.map(h => `<div class="row"><span class="id">Ex ${esc(h.ex)}</span><span class="k">HW${h.hw}</span><span>${esc(h.s)}</span></div>`).join("") : "")
      || `<span class="d">no match</span>`;
    math($("#clist"));
  };
  $("#cq").addEventListener("input", draw); draw(); $("#cq").focus();
  $("#printc").onclick = () => { $("#cq").value = ""; draw(); setTimeout(() => window.print(), 300); };
};

VIEWS.play = () => {
  paint(`<h1>exam playbook</h1><div class="small d" style="margin-bottom:12px">Every past-exam problem reduces to one of these moves. Learn to smell them.</div>
${D.moves.map(m => `<div class="panel tl ${arg === m.id ? "flash" : ""}" id="mv-${m.id}" data-t="${esc(m.t)} · ${esc(topicName(m.t))}">
<h2>${esc(m.name)}</h2>
<div><span class="d">smell ›</span> ${esc(m.when)}</div>
<div class="mt"><span class="g">move ›</span> ${esc(m.how)}</div>
<div class="mt">${m.cite.map(citeTag).join("")} ${m.seen.map(s => `<span class="tag hot">${esc(s)}</span>`).join("")}</div></div>`).join("")}`);
  if (arg) { const el = $("#mv-" + arg); el && el.scrollIntoView({ block: "center" }); }
};

let dojo = { shown: 0 };
VIEWS.dojo = () => {
  if (!arg) {
    paint(`<h1>proof dojo</h1><div class="small d" style="margin-bottom:12px">Write the proof first (paper or box), then reveal step by step. Grade honestly. Run <span class="c">/grade-proof</span> in Claude Code for a rubric review.</div>
<div class="grid g2">${D.proofs.map(p => { const s = strength("proof:" + p.id); return `<div class="panel"><a href="#" data-go="dojo" data-arg="${p.id}"><b>${esc(p.title)}</b></a> <span class="d">${esc(p.cite)}</span><div class="mt">${bar(s, 10)} <span class="small d">${esc(topicName(p.t))}</span></div></div>`; }).join("")}</div>`);
    return;
  }
  const p = D.proofs.find(x => x.id === arg); dojo.shown = 0;
  const draft = store.get("s310a.draft." + p.id) || "";
  paint(`<h1>${esc(p.title)}</h1><div class="d small"><a href="#" data-go="dojo">← all proofs</a> · cite ${esc(p.cite)} · ${esc(topicName(p.t))}</div>
<div class="panel mt"><span class="a">CLAIM ›</span> ${esc(p.stmt)}</div>
<div class="grid g2">
<div><textarea id="draft" placeholder="write your proof here (autosaved). LaTeX ok.">${esc(draft)}</textarea>
<div class="small d mt">tip: copy this into proofs/${p.id}.md and run /grade-proof in Claude Code</div></div>
<div class="panel">
<div class="step hidden" data-step="idea"><span class="m">IDEA ›</span> ${esc(p.idea)}</div>
${p.steps.map((s, i) => `<div class="step hidden" data-step="${i}"><span class="d">${i + 1}.</span> ${esc(s)}</div>`).join("")}
${p.traps.length ? `<div class="step hidden" data-step="traps"><span class="r">TRAPS ›</span> ${p.traps.map(esc).join(" · ")}</div>` : ""}
<div class="mt"><button class="btn pri" id="reveal">reveal next <kbd>space</kbd></button></div>
</div></div>
<div class="panel"><span class="d">how did it go?</span> ${gradeBtns()}</div>`);
  $("#draft").addEventListener("input", e => store.set("s310a.draft." + p.id, e.target.value));
  $("#reveal").onclick = revealStep;
  view.querySelectorAll(".step").forEach(el => el.onclick = () => { el.classList.remove("hidden"); el.classList.add("shown"); });
};
function revealStep() { const h = view.querySelector(".step.hidden"); if (h) { h.classList.remove("hidden"); h.classList.add("shown"); } }
const gradeBtns = () => `<button class="btn bad" data-grade="1">again <kbd>1</kbd></button><button class="btn warn" data-grade="2">hard <kbd>2</kbd></button><button class="btn pri" data-grade="3">good <kbd>3</kbd></button><button class="btn" data-grade="4">easy <kbd>4</kbd></button>`;

let drill = { q: [], i: 0, flipped: false, filter: "all" };
function buildQueue() {
  let pool = ITEMS.filter(i => isDue(i.id));
  if (drill.filter !== "all") pool = pool.filter(i => i.kind === drill.filter);
  // due-first, then weakest exam-yield topics first; new cards interleaved
  const w = i => { const t = D.topics.find(x => x.id === i.t); return (t ? t.w : 1) * (1 - strength(i.id)) + Math.random() * .5; };
  pool.sort((a, b) => w(b) - w(a));
  drill.q = pool.slice(0, 40); drill.i = 0; drill.flipped = false;
}
VIEWS.drill = () => {
  if (!drill.q.length || drill.i >= drill.q.length) buildQueue();
  const it = drill.q[drill.i];
  const filters = ["all", "move", "cite", "recall", "proof", "hw"].map(f => `<button class="btn ${drill.filter === f ? "pri" : ""}" data-filter="${f}">${f}</button>`).join("");
  if (!it) { paint(`<h1>drill</h1><div>${filters}</div><div class="panel mt"><span class="g">queue clear.</span> Nothing due. Go do a past-exam problem.</div>`); return; }
  paint(`<h1>drill</h1><div>${filters} <span class="right d small">${drill.i + 1}/${drill.q.length} · ${esc(it.kind)} · ${esc(it.t ? topicName(it.t) : "homework")}</span></div>
<div class="panel card mt"><div class="face">${it.front}</div>${drill.flipped ? `<div class="back">${it.back}</div>` : `<div class="d small">space to flip</div>`}</div>
<div>${drill.flipped ? gradeBtns() : `<button class="btn pri" id="flip">flip <kbd>space</kbd></button>`}</div>`);
  const f = $("#flip"); if (f) f.onclick = () => { drill.flipped = true; render(); };
};

let e_reset = 0;
let exam = { id: null, t0: 0, tick: null, hints: {} };
VIEWS.vault = () => {
  if (!arg) {
    paint(`<h1>exam vault</h1><div class="small d" style="margin-bottom:12px">Real past exams, tagged by topic and move. Run them timed. Hints cost nothing but your pride.</div>
${D.exams.map(e => `<div class="panel"><a href="#" data-go="vault" data-arg="${e.id}"><b>${esc(e.title)}</b></a> <span class="d">${e.problems.length} problems · ${e.mins} min</span>
<span class="right small"><a href="${e.url}" target="_blank">pdf</a>${e.sol ? ` · <a href="${e.sol}" target="_blank">solutions</a>` : ""}</span>
<div class="mt small">${e.problems.map(p => `<span class="tag">P${p.n}: ${p.t.join(",")}</span>`).join("")} ${S.scores[e.id] ? `<span class="g">best: ${S.scores[e.id]}</span>` : ""}</div></div>`).join("")}
<div class="small d">Also on the site: <a href="https://web.stanford.edu/class/stats310a/HW/midterm2017.pdf" target="_blank">Midterm 2017</a> · <a href="https://web.stanford.edu/class/stats310a/HW/practice_mid2012.pdf" target="_blank">Practice Midterm 2012</a></div>`);
    return;
  }
  const e = D.exams.find(x => x.id === arg);
  paint(`<h1>${esc(e.title)}</h1><div class="small d"><a href="#" data-go="vault">← vault</a> · <a href="${e.url}" target="_blank">original pdf</a></div>
<div class="panel mt"><span class="timer" id="timer">${fmtT(e.mins * 60)}</span> <button class="btn pri" id="tstart">${exam.id === e.id ? "running…" : "start timer"}</button><button class="btn" id="tstop">stop</button>
<span class="small d">open book · cite Dembo by number · pick your best problems</span></div>
${e.problems.map(p => `<div class="prob"><h2>Problem ${p.n} <span class="d small">(${p.pts} pts) ${p.t.map(t => `<span class="tag">${t}</span>`).join("")}</span></h2>
<div>${esc(p.q)}</div>
<div class="mt" id="h-${e.id}-${p.n}">${(exam.hints[e.id + p.n] || []).map(i => `<div class="step shown"><span class="a">hint ${i + 1} ›</span> ${esc(p.hints[i])}</div>`).join("")}</div>
<div class="mt"><button class="btn warn" data-hint="${e.id}:${p.n}">hint</button><button class="btn" data-sol="${e.id}:${p.n}">solution sketch</button>
<button class="btn" data-go="play" data-arg="${p.moves[0]}">move: ${esc(D.moves.find(m => m.id === p.moves[0]).name)}</button>
<span class="small d">score: </span><input class="search" style="width:70px;display:inline-block;padding:2px 6px" data-score="${e.id}:${p.n}" value="${esc(S.scores[e.id + ":" + p.n] ?? "")}" placeholder="/${p.pts}"></div>
<div class="step hidden mt" id="s-${e.id}-${p.n}" style="display:none"><span class="g">SKETCH ›</span> ${esc(p.sol)}</div></div>`).join("")}
<div class="panel">total: <span class="stat" id="etotal">${examTotal(e)}</span><span class="d">/${e.problems.reduce((a, p) => a + p.pts, 0)}</span></div>`);
  $("#tstart").onclick = () => startTimer(e); $("#tstop").onclick = stopTimer;
};
const fmtT = s => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(Math.floor(s) % 60).padStart(2, "0")}`;
function startTimer(e) { stopTimer(); exam.id = e.id; exam.t0 = Date.now(); exam.tick = setInterval(() => { const el = $("#timer"); const left = e.mins * 60 - (Date.now() - exam.t0) / 1000; if (el) { el.textContent = fmtT(Math.max(0, left)); el.className = "timer" + (left < 900 ? " r" : ""); } }, 500); }
function stopTimer() { clearInterval(exam.tick); exam.id = null; }
const examTotal = e => e.problems.reduce((a, p) => a + (+S.scores[e.id + ":" + p.n] || 0), 0);

VIEWS.plan = () => {
  const t = today();
  paint(`<h1>battle plan</h1><div class="small d" style="margin-bottom:12px">Each learning day: Rosenthal for intuition (fast) → Dembo for the citable statement → drill → real problems. ~3–4h/day.</div>
${D.plan.map(p => { const n = p.tasks.length, d = p.tasks.filter((_, j) => S.tasks[p.d + ":" + j]).length; const st = p.d < t ? (d === n ? "g" : "r") : p.d === t ? "a" : "d";
    return `<div class="panel ${p.d === t ? "flash" : ""}" style="${p.d === t ? "border-color:var(--a)" : ""}"><span class="${st}">${p.d < t ? (d === n ? "✓" : "✗") : p.d === t ? "▶" : "·"}</span> <span class="d">${p.d}</span> <span class="tag">${esc(p.tag)}</span> <b>${esc(p.title)}</b> <span class="right d small">${d}/${n}</span>
<ul class="tasks mt">${p.tasks.map((x, j) => `<li data-task="${p.d}:${j}" class="${S.tasks[p.d + ":" + j] ? "done" : ""}">${esc(x)}</li>`).join("")}</ul></div>`; }).join("")}`);
};

VIEWS.log = () => {
  paint(`<h1>error log</h1><div class="small d">Every mistake on a mock goes here. Claude Code's <span class="c">/today</span> reads exported logs to re-plan.</div>
<div class="panel mt grid g2"><div><select id="ltopic">${leaves.map(t => `<option value="${t.id}">${t.id} ${esc(t.title)}</option>`).join("")}</select>
<textarea id="ltext" class="mt" style="min-height:80px" placeholder="what went wrong? (e.g. forgot independence needed for BC II)"></textarea><button class="btn pri mt" id="ladd">log it</button></div>
<div class="small">${Object.entries(S.log.reduce((a, l) => (a[l.t] = (a[l.t] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<div>${"▇".repeat(n)} <span class="c">${t}</span> ${esc(topicName(t))}</div>`).join("") || '<span class="d">no errors logged yet.</span>'}</div></div>
${S.log.slice().reverse().map(l => `<div class="row"><span class="id">${esc(l.t)}</span><span class="k">${esc(l.d.slice(5))}</span><span>${esc(l.x)}</span></div>`).join("")}`);
  $("#ladd").onclick = () => { const x = $("#ltext").value.trim(); if (!x) return; S.log.push({ t: $("#ltopic").value, x, d: today() }); save(); render(); };
};

VIEWS.claude = () => {
  paint(`<h1>claude code link</h1>
<div class="panel tl" data-t="the loop">
<pre class="ascii" style="font-size:12px">  ┌──────────────┐  export JSON   ┌───────────────────┐  /today  ┌────────────┐
  │  this app    │ ─────────────▶ │ progress/*.json   │ ───────▶ │ Claude Code│
  │  (drill/log) │                │ in the git repo   │          │  skills    │
  └──────▲───────┘                └───────────────────┘          └─────┬──────┘
         │      data.js / Anki deck regenerated by /make-cards         │
         └──────────────────────────────────────────────────────────────┘</pre>
</div>
<div class="grid g2">
<div class="panel tl" data-t="skills (.claude/skills)">
<div><span class="c">/today</span> — reads progress export + error log, writes today's adjusted plan</div>
<div><span class="c">/grade-proof</span> — grades a proof in proofs/*.md against the rubric: correctness, cited numbers, gaps</div>
<div><span class="c">/drill</span> — Socratic oral exam on a topic, adapts to your answers</div>
<div><span class="c">/ingest-exam</span> — PDF → tagged problems + moves appended to data.js</div>
<div><span class="c">/make-cards</span> — regenerates the Anki deck from data.js</div>
</div>
<div class="panel tl" data-t="sync">
<button class="btn pri" id="exp">export progress.json</button> <button class="btn" id="expc">copy JSON</button> <label class="btn">import <input type="file" id="imp" accept=".json" hidden></label>
<div class="mt small d">Save to <span class="c">progress/progress.json</span> in the repo and commit. Anki: <span class="c">python3 scripts/build_anki.py</span> → <span class="c">anki/stats310a.apkg</span> (same card IDs).</div>
<div class="mt small"><button class="btn" id="theme">theme: ${S.theme}</button> <button class="btn bad" id="reset">reset all progress</button></div>
</div></div>`);
  $("#exp").onclick = exportProgress;
  $("#expc").onclick = () => navigator.clipboard.writeText(progressJSON()).then(() => say("copied — paste into progress/progress.json"), () => say("clipboard blocked"));
  $("#imp").onchange = ev => { const f = ev.target.files[0]; if (!f) return; f.text().then(t => { Object.assign(S, JSON.parse(t).state || JSON.parse(t)); save(); say("imported."); render(); }); };
  $("#theme").onclick = () => { S.theme = S.theme === "green" ? "amber" : "green"; applyTheme(); save(); render(); };
  $("#reset").onclick = () => { if (e_reset++) { store.set(KEY, "{}"); location.reload(); } else say("click reset again to confirm"); };
};
function progressJSON() {
  const summary = {
    exported: new Date().toISOString(), daysLeft: +daysLeft().toFixed(1), readiness: +readiness().toFixed(3),
    topics: Object.fromEntries(leaves.map(t => [t.id, { title: t.title, mastery: +mastery(t.id).toFixed(2), self: S.self[t.id] ?? null, weight: t.w }])),
    examScores: S.scores, errorLog: S.log,
    lapsed: Object.entries(S.srs).filter(([, s]) => s.lapses > 0).map(([id, s]) => ({ id, lapses: s.lapses })),
    planDone: Object.keys(S.tasks).filter(k => S.tasks[k]),
  };
  return JSON.stringify({ summary, state: S }, null, 2);
}
function exportProgress() {
  const blob = new Blob([progressJSON()], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "progress.json"; a.click();
}

// ───────────── nav / router ─────────────
const NAV = [["mission", "mission"], ["tree", "topic tree"], ["cite", "cite index"], ["play", "playbook"], ["dojo", "proof dojo"], ["drill", "drill"], ["vault", "exam vault"], ["plan", "plan"], ["log", "error log"], ["claude", "claude link"]];
function nav() {
  $("#nav").innerHTML = NAV.map(([k, l], i) => `<button data-go="${k}" class="${current === k ? "on" : ""}"><span class="k">${i < 9 ? i + 1 : 0}</span>${l}</button>`).join("")
    + `<div class="navfoot">src: course site · Dembo lnotes (class ver.) · Rosenthal 2e<br><br>${ITEMS.length} cards · ${D.thms.length} theorems · ${D.moves.length} moves</div>`;
}
function go(v, a = null) { if (v !== "vault") stopTimer(); current = v; arg = a; if (v !== "drill") { } location.hash = v + (a ? "/" + a : ""); render(); }
function render() { nav(); (VIEWS[current] || VIEWS.mission)(); hud(); }
function hud() {
  const ms = Math.max(0, EXAM - Date.now()); const d = Math.floor(ms / DAY), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  const t = `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  $("#tminus").textContent = t; const b = $("#bigT"); if (b) b.textContent = `${d}d ${String(h).padStart(2, "0")}h`;
  $("#ready").textContent = Math.round(readiness() * 100) + "%"; $("#due").textContent = ITEMS.filter(i => isDue(i.id)).length;
}
setInterval(hud, 1000);
function applyTheme() { document.body.classList.toggle("amber", S.theme === "amber"); }

// ───────────── events ─────────────
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]"); if (g) { e.preventDefault(); go(g.dataset.go, g.dataset.arg || null); return; }
  const n = e.target.closest("[data-node]"); if (n && !e.target.closest(".open")) { const id = n.dataset.node; arg = arg === id ? null : (D.topics.find(t => t.id === id).parent ? id : null); render(); return; }
  const sf = e.target.closest("[data-self]"); if (sf) { const [t, v] = sf.dataset.self.split(":"); S.self[t] = +v; save(); render(); return; }
  const tk = e.target.closest("[data-task]"); if (tk) { const k = tk.dataset.task; S.tasks[k] = !S.tasks[k]; if (S.tasks[k]) bumpStreak(); save(); render(); return; }
  const c = e.target.closest("[data-cite]"); if (c) { go("cite", c.dataset.cite); return; }
  const gr = e.target.closest("[data-grade]"); if (gr) { doGrade(+gr.dataset.grade); return; }
  const fl = e.target.closest("[data-filter]"); if (fl) { drill.filter = fl.dataset.filter; drill.q = []; render(); return; }
  const h = e.target.closest("[data-hint]"); if (h) { const [eid, pn] = h.dataset.hint.split(":"); const p = D.exams.find(x => x.id === eid).problems.find(x => x.n == pn); const k = eid + pn; exam.hints[k] = exam.hints[k] || []; if (exam.hints[k].length < p.hints.length) exam.hints[k].push(exam.hints[k].length); else say("no more hints — try the sketch"); render(); return; }
  const so = e.target.closest("[data-sol]"); if (so) { const [eid, pn] = so.dataset.sol.split(":"); const el = $(`#s-${eid}-${pn}`); el.style.display = "block"; el.classList.remove("hidden"); el.classList.add("shown"); return; }
});
document.addEventListener("input", e => {
  const sc = e.target.closest("[data-score]"); if (sc) { S.scores[sc.dataset.score] = sc.value; const eid = sc.dataset.score.split(":")[0]; const ex = D.exams.find(x => x.id === eid); const tot = examTotal(ex); S.scores[eid] = Math.max(+S.scores[eid] || 0, tot); $("#etotal").textContent = tot; save(); }
});
function doGrade(q) {
  if (current === "drill") { const it = drill.q[drill.i]; if (!it || !drill.flipped) return; grade(it.id, q); if (q === 1) drill.q.push(it); drill.i++; drill.flipped = false; say(["", "again — requeued", "hard", "good", "easy"][q]); render(); }
  else if (current === "dojo" && arg) { grade("proof:" + arg, q); say("logged: " + ["", "again", "hard", "good", "easy"][q]); go("dojo"); }
}
document.addEventListener("keydown", e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (e.key === "/" && !typing) { e.preventDefault(); $("#cmdline").focus(); return; }
  if (e.key === "Escape") { document.activeElement.blur(); return; }
  if (typing) return;
  if (e.key === " ") { e.preventDefault(); if (current === "drill") { if (!drill.flipped) { drill.flipped = true; render(); } } else if (current === "dojo" && arg) revealStep(); return; }
  if (/^[1-4]$/.test(e.key) && ((current === "drill" && drill.flipped) || (current === "dojo" && arg))) { doGrade(+e.key); return; }
  if (/^[0-9]$/.test(e.key)) { const i = e.key === "0" ? 9 : +e.key - 1; if (NAV[i]) go(NAV[i][0]); }
});

// ───────────── command line ─────────────
const say = m => { $("#cmdout").textContent = m; };
const CMDS = {
  help: () => say("mission tree cite <q> play dojo [id] drill [kind] vault [id] plan log claude · stats export theme matrix"),
  stats: () => say(`readiness ${Math.round(readiness() * 100)}% · ${Object.keys(S.srs).length}/${ITEMS.length} cards seen · ${S.log.length} errors logged · ${daysLeft().toFixed(1)} days left`),
  export: exportProgress, theme: () => { S.theme = S.theme === "green" ? "amber" : "green"; applyTheme(); save(); },
  matrix: () => matrixRain(), clear: () => say(""),
};
$("#cmdline").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const [c, ...rest] = e.target.value.trim().split(/\s+/); const a = rest.join(" ") || null; e.target.value = "";
  const alias = { m: "mission", t: "tree", c: "cite", p: "play", d: "dojo", r: "drill", v: "vault", l: "log", playbook: "play", proof: "dojo", exam: "vault" };
  const v = alias[c] || c;
  if (CMDS[v]) return CMDS[v](a);
  if (VIEWS[v]) { if (v === "drill" && a) { drill.filter = a; drill.q = []; } go(v, v === "drill" ? null : a); say("› " + v + (a ? " " + a : "")); e.target.blur(); return; }
  // fallthrough: treat as a cite search
  if (c) { go("cite", e.target.value || [c, ...rest].join(" ")); say(`no command '${c}' — searched the citation index`); }
});

// ───────────── eye candy ─────────────
function matrixRain() {
  const cv = document.createElement("canvas"); Object.assign(cv.style, { position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none" });
  document.body.appendChild(cv); const x = cv.getContext("2d"); cv.width = innerWidth; cv.height = innerHeight;
  const glyphs = "σΩΣ∫∂λμπΦ∞≤≥⇒∀∃01ℙ𝔼".split(""), cols = Math.floor(cv.width / 14), y = Array(cols).fill(0); let n = 0;
  const id = setInterval(() => { x.fillStyle = "rgba(0,0,0,.08)"; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = getComputedStyle(document.body).getPropertyValue("--g"); x.font = "14px monospace";
    y.forEach((v, i) => { x.fillText(glyphs[Math.random() * glyphs.length | 0], i * 14, v * 14); y[i] = v * 14 > cv.height && Math.random() > .975 ? 0 : v + 1; });
    if (++n > 160) { clearInterval(id); cv.remove(); } }, 33);
}
function boot() {
  try { if (sessionStorage.getItem("s310a.booted")) return Promise.resolve(); sessionStorage.setItem("s310a.booted", 1); } catch {}
  const el = $("#boot"); el.style.display = "block";
  const lines = [
    "[  0.000] stats310a-final-ops kernel v1.0 — booting",
    `[  0.012] mounting dembo_lnotes.pdf ........ <span class="a">${D.thms.length} theorems indexed</span>`,
    `[  0.031] mounting rosenthal_2e.toc ........ ok`,
    `[  0.044] loading exam vault ............... ${D.exams.map(e => e.id).join(" ")}`,
    `[  0.059] compiling playbook ............... ${D.moves.length} moves`,
    `[  0.071] srs engine (exam-aware sm-2) ..... ${ITEMS.length} cards, ${ITEMS.filter(i => isDue(i.id)).length} due`,
    `[  0.088] target lock ...................... <span class="a">${EXAM.toDateString()} 08:30 PT</span>`,
    `[  0.090] T-minus ${daysLeft().toFixed(1)} days. readiness ${Math.round(readiness() * 100)}%.`,
    "", "<span class=\"g\">ready.</span> press any key",
  ];
  let i = 0;
  return new Promise(res => {
    const done = () => { el.style.display = "none"; removeEventListener("keydown", done); el.removeEventListener("click", done); res(); };
    const t = setInterval(() => { el.innerHTML += lines[i++] + "\n"; if (i >= lines.length) { clearInterval(t); setTimeout(done, 900); } }, 110);
    addEventListener("keydown", done, { once: true }); el.addEventListener("click", done, { once: true });
  });
}

// ───────────── start ─────────────
applyTheme();
const [h0, h1] = location.hash.slice(1).split("/"); if (VIEWS[h0]) { current = h0; arg = h1 || null; }
boot().then(render); render();
addEventListener("load", () => render()); // re-render once KaTeX has loaded
window.S310 = { DATA: D, ITEMS, S, mastery, readiness };
})();
